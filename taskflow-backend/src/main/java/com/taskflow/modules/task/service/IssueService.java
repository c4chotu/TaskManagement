package com.taskflow.modules.task.service;

import com.taskflow.common.exception.EntityNotFoundException;
import com.taskflow.common.exception.TenantIsolationException;
import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.auth.domain.User;
import com.taskflow.modules.auth.repository.UserRepository;
import com.taskflow.modules.task.domain.*;
import com.taskflow.modules.task.dto.TaskRequest;
import com.taskflow.modules.task.dto.TaskResponse;
import com.taskflow.modules.task.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class IssueService {

    private static final Logger log = LoggerFactory.getLogger(IssueService.class);

    private final TaskService taskService;
    private final TaskRepository taskRepository;
    private final IssueDetailRepository issueDetailRepository;
    private final SlaDefinitionRepository slaDefinitionRepository;
    private final IssueEscalationRepository issueEscalationRepository;
    private final OnCallScheduleRepository onCallScheduleRepository;
    private final UserRepository userRepository;

    public IssueService(TaskService taskService,
                        TaskRepository taskRepository,
                        IssueDetailRepository issueDetailRepository,
                        SlaDefinitionRepository slaDefinitionRepository,
                        IssueEscalationRepository issueEscalationRepository,
                        OnCallScheduleRepository onCallScheduleRepository,
                        UserRepository userRepository) {
        this.taskService = taskService;
        this.taskRepository = taskRepository;
        this.issueDetailRepository = issueDetailRepository;
        this.slaDefinitionRepository = slaDefinitionRepository;
        this.issueEscalationRepository = issueEscalationRepository;
        this.onCallScheduleRepository = onCallScheduleRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public IssueDetail createIssue(TaskRequest taskRequest, String severity, String environment,
                                   String affectedVersion, boolean customerReported, String customerName,
                                   String customerImpact) {
        // Create the task using the task service
        TaskResponse taskResponse = taskService.createTask(taskRequest);
        UUID taskId = taskResponse.getId();

        // Update the task type to ISSUE
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Task not found with ID: " + taskId));
        task.setTaskType("ISSUE");
        taskRepository.save(task);

        UUID orgId = task.getOrganizationId();
        UUID currentUserId = SecurityContextHelper.getCurrentUserId();

        // Load SLA definitions
        int responseMinutes = getDefaultResponseMinutes(severity);
        int fixMinutes = getDefaultFixMinutes(severity);
        boolean businessHoursOnly = true;

        Optional<SlaDefinition> slaOpt = slaDefinitionRepository.findByOrganizationIdAndSeverity(orgId, severity);
        if (slaOpt.isPresent()) {
            responseMinutes = slaOpt.get().getResponseTimeMinutes();
            fixMinutes = slaOpt.get().getFixTimeMinutes();
            businessHoursOnly = slaOpt.get().isBusinessHoursOnly();
        }

        Instant now = Instant.now();
        Instant responseDueAt = calculateDueTime(now, responseMinutes, businessHoursOnly);
        Instant fixDueAt = calculateDueTime(now, fixMinutes, businessHoursOnly);

        IssueDetail issueDetail = IssueDetail.builder()
                .id(UUID.randomUUID())
                .taskId(taskId)
                .severity(severity)
                .reportedBy(currentUserId)
                .reportedAt(now)
                .environment(environment)
                .affectedVersion(affectedVersion)
                .customerReported(customerReported)
                .customerName(customerName)
                .customerImpact(customerImpact)
                .responseDueAt(responseDueAt)
                .fixDueAt(fixDueAt)
                .build();

        IssueDetail savedDetail = issueDetailRepository.save(issueDetail);

        // Assign to current Week On-Call Engineer if schedule exists
        UUID onCallUser = getOnCallEngineer(orgId);
        if (onCallUser != null) {
            taskService.assignTask(taskId, onCallUser, "ON_CALL");
            log.info("Issue {} assigned to On-Call Engineer {}", taskId, onCallUser);
        }

        // SEV0 issues trigger immediate pager alerts
        if ("SEV0".equalsIgnoreCase(severity)) {
            pageEmergency(taskId, severity, orgId);
        }

        return savedDetail;
    }

    @Transactional
    public IssueDetail updateSeverity(UUID taskId, String newSeverity) {
        IssueDetail detail = issueDetailRepository.findByTaskId(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Issue details not found for task: " + taskId));

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + taskId));

        String oldSeverity = detail.getSeverity();
        detail.setSeverity(newSeverity);

        // Recalculate SLA timers based on original reported_at
        UUID orgId = task.getOrganizationId();
        int responseMinutes = getDefaultResponseMinutes(newSeverity);
        int fixMinutes = getDefaultFixMinutes(newSeverity);
        boolean businessHoursOnly = true;

        Optional<SlaDefinition> slaOpt = slaDefinitionRepository.findByOrganizationIdAndSeverity(orgId, newSeverity);
        if (slaOpt.isPresent()) {
            responseMinutes = slaOpt.get().getResponseTimeMinutes();
            fixMinutes = slaOpt.get().getFixTimeMinutes();
            businessHoursOnly = slaOpt.get().isBusinessHoursOnly();
        }

        Instant reportedAt = detail.getReportedAt();
        detail.setResponseDueAt(calculateDueTime(reportedAt, responseMinutes, businessHoursOnly));
        detail.setFixDueAt(calculateDueTime(reportedAt, fixMinutes, businessHoursOnly));

        IssueDetail saved = issueDetailRepository.save(detail);

        log.info("Severity updated from {} to {} for issue {}", oldSeverity, newSeverity, taskId);

        if ("SEV0".equalsIgnoreCase(newSeverity)) {
            pageEmergency(taskId, newSeverity, orgId);
        }

        return saved;
    }

    @Transactional
    public void respondToIssue(UUID taskId) {
        IssueDetail detail = issueDetailRepository.findByTaskId(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Issue details not found for task: " + taskId));

        if (detail.getRespondedAt() == null) {
            detail.setRespondedAt(Instant.now());
            issueDetailRepository.save(detail);
            log.info("First response logged for issue {}", taskId);
        }
    }

    @Transactional
    public void resolveIssue(UUID taskId, String rootCause, String resolution) {
        IssueDetail detail = issueDetailRepository.findByTaskId(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Issue details not found for task: " + taskId));

        if (rootCause == null || rootCause.trim().isEmpty()) {
            throw new IllegalArgumentException("Root cause analysis is required to resolve an issue.");
        }

        detail.setRootCause(rootCause);
        detail.setResolution(resolution);
        issueDetailRepository.save(detail);

        // Update task status to a closed status
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + taskId));
        
        log.info("Issue {} resolved with root cause: {}", taskId, rootCause);
    }

    @Transactional
    public void verifyIssue(UUID taskId, UUID verifierId) {
        IssueDetail detail = issueDetailRepository.findByTaskId(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Issue details not found for task: " + taskId));

        detail.setVerifiedAt(Instant.now());
        detail.setVerifiedBy(verifierId);
        issueDetailRepository.save(detail);

        log.info("Issue {} verified by user {}", taskId, verifierId);
    }

    @Transactional
    public void escalateIssue(UUID taskId, String reason) {
        IssueDetail detail = issueDetailRepository.findByTaskId(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Issue details not found for task: " + taskId));

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + taskId));

        UUID actorId = SecurityContextHelper.getCurrentUserId();
        if (actorId == null) {
            actorId = detail.getReportedBy(); // Fallback to reporter
        }

        int count = task.getEscalationCount();
        String fromRole = "ON_CALL";
        String toRole = "TEAM_LEAD";

        if (count == 1) {
            fromRole = "TEAM_LEAD";
            toRole = "DEPT_HEAD";
        } else if (count >= 2) {
            fromRole = "DEPT_HEAD";
            toRole = "ORG_ADMIN";
        }

        IssueEscalation escalation = IssueEscalation.builder()
                .id(UUID.randomUUID())
                .issueId(taskId)
                .escalatedFromRole(fromRole)
                .escalatedToRole(toRole)
                .escalatedBy(actorId)
                .escalatedAt(Instant.now())
                .reason(reason)
                .build();

        issueEscalationRepository.save(escalation);

        task.setEscalationCount(count + 1);
        task.setEscalatedAt(Instant.now());
        taskRepository.save(task);

        log.warn("Issue {} escalated from {} to {} due to: {}", taskId, fromRole, toRole, reason);
    }

    @Transactional(readOnly = true)
    public long getSLAStatus(UUID taskId) {
        IssueDetail detail = issueDetailRepository.findByTaskId(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Issue details not found for task: " + taskId));

        Instant due = detail.getFixDueAt();
        if (due == null) return 99999;

        Duration duration = Duration.between(Instant.now(), due);
        return duration.toMinutes();
    }

    @Transactional
    public void markDuplicate(UUID taskId, UUID duplicateOfId) {
        IssueDetail detail = issueDetailRepository.findByTaskId(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Issue details not found for task: " + taskId));

        detail.setDuplicateOfId(duplicateOfId);
        issueDetailRepository.save(detail);

        log.info("Issue {} marked as duplicate of {}", taskId, duplicateOfId);
    }

    @Transactional(readOnly = true)
    public UUID getOnCallEngineer(UUID orgId) {
        LocalDate today = LocalDate.now();
        // Adjust to Monday of this week
        LocalDate weekStart = today.with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return onCallScheduleRepository.findByOrganizationIdAndWeekStartDateAndCoverageType(orgId, weekStart, "PRIMARY")
                .map(OnCallSchedule::getUserId)
                .orElse(null);
    }

    private int getDefaultResponseMinutes(String severity) {
        switch (severity.toUpperCase()) {
            case "SEV0": return 15;
            case "SEV1": return 30;
            case "SEV2": return 120;
            case "SEV3": return 1440; // 24 hours
            case "SEV4": return 2880; // 48 hours
            default: return 120;
        }
    }

    private int getDefaultFixMinutes(String severity) {
        switch (severity.toUpperCase()) {
            case "SEV0": return 60; // 1 hour
            case "SEV1": return 120; // 2 hours
            case "SEV2": return 480; // 8 hours
            case "SEV3": return 4320; // 72 hours
            case "SEV4": return 8640; // 144 hours
            default: return 480;
        }
    }

    private Instant calculateDueTime(Instant start, int minutesToAdd, boolean businessHoursOnly) {
        if (!businessHoursOnly) {
            return start.plus(Duration.ofMinutes(minutesToAdd));
        }

        // Simple business hours calculator:
        // Business hours are Monday to Friday 9:00 - 17:00.
        // We traverse minute by minute or step wise. For simplicity:
        LocalDateTime current = LocalDateTime.ofInstant(start, ZoneOffset.UTC);
        int remainingMinutes = minutesToAdd;

        while (remainingMinutes > 0) {
            // Check if current hour is outside business hours or falls on weekend
            DayOfWeek day = current.getDayOfWeek();
            int hour = current.getHour();

            if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) {
                // Skip to Monday 9:00
                current = current.plusDays(day == DayOfWeek.SATURDAY ? 2 : 1)
                        .withHour(9).withMinute(0).withSecond(0).withNano(0);
                continue;
            }

            if (hour < 9) {
                current = current.withHour(9).withMinute(0).withSecond(0).withNano(0);
                continue;
            }

            if (hour >= 17) {
                // Move to next day 9:00
                current = current.plusDays(1).withHour(9).withMinute(0).withSecond(0).withNano(0);
                continue;
            }

            // Find remaining minutes until end of business day
            LocalDateTime endOfBusinessDay = current.withHour(17).withMinute(0).withSecond(0).withNano(0);
            long minutesLeftInDay = Duration.between(current, endOfBusinessDay).toMinutes();

            if (remainingMinutes <= minutesLeftInDay) {
                current = current.plusMinutes(remainingMinutes);
                remainingMinutes = 0;
            } else {
                remainingMinutes -= minutesLeftInDay;
                current = endOfBusinessDay;
            }
        }
        return current.toInstant(ZoneOffset.UTC);
    }

    private void pageEmergency(UUID taskId, String severity, UUID orgId) {
        log.error("================ EMERGENCY ALERT ================");
        log.error("!!! URGENT PAGER ALERT !!! Severity: {}, TaskId: {}, Organization: {}", severity, taskId, orgId);
        log.error("Paging Department Head and SRE On-Call Engineers immediately!");
        log.error("=================================================");
    }
}
