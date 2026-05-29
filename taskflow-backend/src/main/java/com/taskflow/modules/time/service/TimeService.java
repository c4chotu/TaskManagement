package com.taskflow.modules.time.service;

import com.taskflow.common.exception.EntityNotFoundException;
import com.taskflow.common.exception.TenantIsolationException;
import com.taskflow.common.exception.UnauthorizedException;
import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.project.repository.ProjectMemberRepository;
import com.taskflow.modules.task.domain.Task;
import com.taskflow.modules.task.domain.TaskAssignment;
import com.taskflow.modules.task.repository.TaskAssignmentRepository;
import com.taskflow.modules.task.repository.TaskRepository;
import com.taskflow.modules.time.domain.TimeEntry;
import com.taskflow.modules.time.domain.Timesheet;
import com.taskflow.modules.time.repository.TimeEntryRepository;
import com.taskflow.modules.time.repository.TimesheetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class TimeService {

    private final TimeEntryRepository timeEntryRepository;
    private final TimesheetRepository timesheetRepository;
    private final TaskRepository taskRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final ProjectMemberRepository projectMemberRepository;

    public TimeService(TimeEntryRepository timeEntryRepository,
                       TimesheetRepository timesheetRepository,
                       TaskRepository taskRepository,
                       TaskAssignmentRepository taskAssignmentRepository,
                       ProjectMemberRepository projectMemberRepository) {
        this.timeEntryRepository = timeEntryRepository;
        this.timesheetRepository = timesheetRepository;
        this.taskRepository = taskRepository;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.projectMemberRepository = projectMemberRepository;
    }

    @Transactional
    public TimeEntry startTimer(UUID taskId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        UUID orgId = SecurityContextHelper.getCurrentOrgId();

        // Stop any active timer first
        timeEntryRepository.findActiveTimer(userId).ifPresent(active -> {
            stopTimerEntry(active);
            timeEntryRepository.save(active);
        });

        Task task = getVerifiedTask(taskId, userId, orgId);

        TimeEntry entry = TimeEntry.builder()
                .id(UUID.randomUUID())
                .taskId(taskId)
                .userId(userId)
                .startTime(Instant.now())
                .organizationId(orgId)
                .build();

        return timeEntryRepository.save(entry);
    }

    @Transactional
    public TimeEntry stopTimer(UUID entryId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();

        TimeEntry entry = timeEntryRepository.findById(entryId)
                .orElseThrow(() -> new EntityNotFoundException("Time entry not found: " + entryId));

        if (!Objects.equals(entry.getUserId(), userId)) {
            throw new UnauthorizedException("Cannot stop another user's timer");
        }
        if (entry.getEndTime() != null) {
            throw new IllegalStateException("Timer is already stopped");
        }

        stopTimerEntry(entry);
        return timeEntryRepository.save(entry);
    }

    @Transactional
    public TimeEntry createManualEntry(UUID taskId, Instant startTime, Instant endTime, String description, boolean billable) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        UUID orgId = SecurityContextHelper.getCurrentOrgId();

        Task task = getVerifiedTask(taskId, userId, orgId);

        if (endTime != null && endTime.isBefore(startTime)) {
            throw new IllegalArgumentException("End time cannot be before start time");
        }

        // Check for overlapping entries
        checkNoOverlap(userId, startTime, endTime);

        int durationMinutes = endTime != null
                ? (int) ChronoUnit.MINUTES.between(startTime, endTime)
                : 0;

        TimeEntry entry = TimeEntry.builder()
                .id(UUID.randomUUID())
                .taskId(taskId)
                .userId(userId)
                .startTime(startTime)
                .endTime(endTime)
                .durationMinutes(durationMinutes)
                .description(description)
                .billable(billable)
                .organizationId(orgId)
                .build();

        return timeEntryRepository.save(entry);
    }

    @Transactional
    public TimeEntry updateEntry(UUID entryId, Instant startTime, Instant endTime, String description, boolean billable) {
        UUID userId = SecurityContextHelper.getCurrentUserId();

        TimeEntry entry = timeEntryRepository.findById(entryId)
                .orElseThrow(() -> new EntityNotFoundException("Time entry not found: " + entryId));

        if (!Objects.equals(entry.getUserId(), userId)) {
            throw new UnauthorizedException("Cannot modify another user's time entry");
        }

        entry.setStartTime(startTime);
        entry.setEndTime(endTime);
        entry.setDescription(description);
        entry.setBillable(billable);
        if (endTime != null && startTime != null) {
            entry.setDurationMinutes((int) ChronoUnit.MINUTES.between(startTime, endTime));
        }

        return timeEntryRepository.save(entry);
    }

    @Transactional
    public void deleteEntry(UUID entryId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        TimeEntry entry = timeEntryRepository.findById(entryId)
                .orElseThrow(() -> new EntityNotFoundException("Time entry not found: " + entryId));
        if (!Objects.equals(entry.getUserId(), userId)) {
            throw new UnauthorizedException("Cannot delete another user's time entry");
        }
        timeEntryRepository.delete(entry);
    }

    @Transactional(readOnly = true)
    public List<TimeEntry> listEntries(Instant from, Instant to) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return timeEntryRepository.findByUserIdAndDateRange(userId, from, to);
    }

    @Transactional
    public Timesheet submitTimesheet(UUID timesheetId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();

        Timesheet timesheet = timesheetRepository.findById(timesheetId)
                .orElseThrow(() -> new EntityNotFoundException("Timesheet not found: " + timesheetId));

        if (!Objects.equals(timesheet.getUserId(), userId)) {
            throw new UnauthorizedException("Cannot submit another user's timesheet");
        }
        if (!"DRAFT".equals(timesheet.getStatus())) {
            throw new IllegalStateException("Only DRAFT timesheets can be submitted");
        }

        // Recalculate totals from time entries
        LocalDate weekStart = timesheet.getWeekStart();
        LocalDate weekEnd = timesheet.getWeekEnd();
        Instant from = weekStart.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant to = weekEnd.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);

        List<TimeEntry> entries = timeEntryRepository.findByUserIdAndDateRange(userId, from, to);
        int totalMinutes = entries.stream().mapToInt(e -> e.getDurationMinutes() != null ? e.getDurationMinutes() : 0).sum();
        int billableMinutes = entries.stream().filter(TimeEntry::isBillable).mapToInt(e -> e.getDurationMinutes() != null ? e.getDurationMinutes() : 0).sum();

        timesheet.setTotalMinutes(totalMinutes);
        timesheet.setBillableMinutes(billableMinutes);
        timesheet.setStatus("SUBMITTED");
        timesheet.setSubmittedAt(Instant.now());

        return timesheetRepository.save(timesheet);
    }

    @Transactional
    public Timesheet approveTimesheet(UUID timesheetId) {
        UUID approverId = SecurityContextHelper.getCurrentUserId();

        Timesheet timesheet = timesheetRepository.findById(timesheetId)
                .orElseThrow(() -> new EntityNotFoundException("Timesheet not found: " + timesheetId));

        if (!"SUBMITTED".equals(timesheet.getStatus())) {
            throw new IllegalStateException("Only SUBMITTED timesheets can be approved");
        }

        timesheet.setStatus("APPROVED");
        timesheet.setApprovedAt(Instant.now());
        timesheet.setApprovedBy(approverId);

        return timesheetRepository.save(timesheet);
    }

    @Transactional
    public Timesheet getOrCreateTimesheetForWeek(UUID userId, LocalDate anyDateInWeek) {
        LocalDate weekStart = anyDateInWeek.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);
        UUID orgId = SecurityContextHelper.getCurrentOrgId();

        return timesheetRepository.findByUserIdAndWeekStart(userId, weekStart)
                .orElseGet(() -> timesheetRepository.save(
                        Timesheet.builder()
                                .id(UUID.randomUUID())
                                .userId(userId)
                                .organizationId(orgId)
                                .weekStart(weekStart)
                                .weekEnd(weekEnd)
                                .status("DRAFT")
                                .build()
                ));
    }

    // --- Private helpers ---

    private void stopTimerEntry(TimeEntry entry) {
        Instant now = Instant.now();
        entry.setEndTime(now);
        entry.setDurationMinutes((int) ChronoUnit.MINUTES.between(entry.getStartTime(), now));
    }

    private Task getVerifiedTask(UUID taskId, UUID userId, UUID orgId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + taskId));

        if (!Objects.equals(task.getOrganizationId(), orgId)) {
            throw new TenantIsolationException("Unauthorized cross-tenant access request blocked");
        }

        // Verify user is assigned to or is a project member for this task
        boolean isMember = projectMemberRepository
                .findByProjectIdAndUserId(task.getProjectId(), userId).isPresent();
        if (!isMember) {
            throw new UnauthorizedException("User is not a member of this project");
        }

        return task;
    }

    private void checkNoOverlap(UUID userId, Instant startTime, Instant endTime) {
        if (endTime == null) return;

        Instant checkEnd = endTime;
        List<TimeEntry> existing = timeEntryRepository.findByUserIdAndDateRange(
                userId, startTime.minus(24, ChronoUnit.HOURS), checkEnd.plus(24, ChronoUnit.HOURS));

        for (TimeEntry e : existing) {
            if (e.getEndTime() == null) continue;
            boolean overlaps = startTime.isBefore(e.getEndTime()) && checkEnd.isAfter(e.getStartTime());
            if (overlaps) {
                throw new IllegalArgumentException("Time entry overlaps with an existing entry");
            }
        }
    }
}
