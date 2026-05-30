package com.taskflow.modules.task.service;

import com.taskflow.common.exception.EntityNotFoundException;
import com.taskflow.common.exception.UnauthorizedException;
import com.taskflow.modules.auth.service.RoleHierarchyService;
import com.taskflow.modules.task.domain.*;
import com.taskflow.modules.task.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StatusWorkflowService {

    private static final Logger log = LoggerFactory.getLogger(StatusWorkflowService.class);

    private final TaskRepository taskRepository;
    private final CustomTaskStatusRepository customTaskStatusRepository;
    private final StatusTransitionRepository statusTransitionRepository;
    private final StatusHistoryRepository statusHistoryRepository;
    private final TaskDependencyRepository taskDependencyRepository;
    private final RoleHierarchyService roleHierarchyService;
    private final IssueDetailRepository issueDetailRepository;
    private final RestTemplate restTemplate;

    public StatusWorkflowService(TaskRepository taskRepository,
                                 CustomTaskStatusRepository customTaskStatusRepository,
                                 StatusTransitionRepository statusTransitionRepository,
                                 StatusHistoryRepository statusHistoryRepository,
                                 TaskDependencyRepository taskDependencyRepository,
                                 RoleHierarchyService roleHierarchyService,
                                 IssueDetailRepository issueDetailRepository) {
        this.taskRepository = taskRepository;
        this.customTaskStatusRepository = customTaskStatusRepository;
        this.statusTransitionRepository = statusTransitionRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.taskDependencyRepository = taskDependencyRepository;
        this.roleHierarchyService = roleHierarchyService;
        this.issueDetailRepository = issueDetailRepository;
        this.restTemplate = new RestTemplate();
    }

    @Transactional(readOnly = true)
    public List<CustomTaskStatus> getAvailableTransitions(UUID taskId, UUID userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + taskId));

        UUID currentStatusId = task.getCurrentStatusId();
        if (currentStatusId == null) {
            // Return all statuses as possible targets if task doesn't have a status
            return customTaskStatusRepository.findByProjectIdOrderBySortOrderAsc(task.getProjectId());
        }

        List<StatusTransition> transitions = statusTransitionRepository.findByFromStatusId(currentStatusId);
        List<CustomTaskStatus> targetStatuses = new ArrayList<>();

        for (StatusTransition transition : transitions) {
            CustomTaskStatus targetStatus = customTaskStatusRepository.findById(transition.getToStatusId()).orElse(null);
            if (targetStatus != null && canUserPerformTransition(userId, task, transition)) {
                targetStatuses.add(targetStatus);
            }
        }

        return targetStatuses;
    }

    @Transactional
    public Task transitionStatus(UUID taskId, UUID newStatusId, UUID userId, String comment) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + taskId));

        CustomTaskStatus newStatus = customTaskStatusRepository.findById(newStatusId)
                .orElseThrow(() -> new EntityNotFoundException("Status not found: " + newStatusId));

        UUID oldStatusId = task.getCurrentStatusId();

        // 1. Validate the transition
        validateTransition(task, oldStatusId, newStatus, userId, comment);

        // 2. Calculate time in previous status
        Integer durationMinutes = null;
        if (oldStatusId != null) {
            durationMinutes = calculateTimeInStatus(taskId, oldStatusId);
        }

        // 3. Save status history
        StatusHistory history = StatusHistory.builder()
                .id(UUID.randomUUID())
                .taskId(taskId)
                .fromStatusId(oldStatusId)
                .toStatusId(newStatusId)
                .changedBy(userId)
                .changedAt(Instant.now())
                .comment(comment)
                .timeInStatusMinutes(durationMinutes)
                .build();

        statusHistoryRepository.save(history);

        // 4. Update task status
        task.setCurrentStatusId(newStatusId);
        Task savedTask = taskRepository.save(task);

        // 5. Execute side-effect actions (e.g. Webhooks)
        if (oldStatusId != null) {
            CustomTaskStatus oldStatus = customTaskStatusRepository.findById(oldStatusId).orElse(null);
            executeTransitionActions(task, oldStatus, newStatus);
        }

        log.info("Task {} transitioned to status {}", taskId, newStatus.getName());
        return savedTask;
    }

    public void validateTransition(Task task, UUID oldStatusId, CustomTaskStatus newStatus, UUID userId, String comment) {
        // Enforce required comment for BLOCKED status
        if ("BLOCKED".equalsIgnoreCase(newStatus.getCategory()) && (comment == null || comment.trim().isEmpty())) {
            throw new IllegalArgumentException("Transition to BLOCKED category requires an explanatory comment.");
        }

        if (oldStatusId != null) {
            StatusTransition transition = statusTransitionRepository.findByFromStatusIdAndToStatusId(oldStatusId, newStatus.getId())
                    .orElseThrow(() -> new IllegalArgumentException("No transition exists from current status to " + newStatus.getName()));

            if (!canUserPerformTransition(userId, task, transition)) {
                throw new UnauthorizedException("User does not have required role to perform this status transition");
            }
        }

        // Subtask / Dependency check before moving to COMPLETED
        if ("COMPLETED".equalsIgnoreCase(newStatus.getCategory())) {
            // RCA check for Issues
            if ("ISSUE".equalsIgnoreCase(task.getTaskType())) {
                IssueDetail issueDetail = issueDetailRepository.findByTaskId(task.getId()).orElse(null);
                if (issueDetail == null || issueDetail.getRootCause() == null || issueDetail.getRootCause().trim().isEmpty()
                        || issueDetail.getResolution() == null || issueDetail.getResolution().trim().isEmpty()) {
                    throw new IllegalArgumentException("Root cause analysis (RCA) and resolution are required before transitioning an incident to COMPLETED status.");
                }
            }

            // Check subtasks
            List<Task> subtasks = taskRepository.findByProjectIdAndDeletedAtIsNull(task.getProjectId()).stream()
                    .filter(t -> task.getId().equals(t.getParentTaskId()))
                    .collect(Collectors.toList());
            for (Task sub : subtasks) {
                if (sub.getCurrentStatusId() != null) {
                    CustomTaskStatus subStatus = customTaskStatusRepository.findById(sub.getCurrentStatusId()).orElse(null);
                    if (subStatus != null && !"COMPLETED".equalsIgnoreCase(subStatus.getCategory())) {
                        throw new IllegalArgumentException("Cannot complete task because subtask '" + sub.getTitle() + "' is not completed.");
                    }
                }
            }

            // Check predecessor tasks
            List<TaskDependency> deps = taskDependencyRepository.findByTaskId(task.getId());
            for (TaskDependency dep : deps) {
                Task predecessor = taskRepository.findById(dep.getPredecessorId()).orElse(null);
                if (predecessor != null && predecessor.getDeletedAt() == null && predecessor.getCurrentStatusId() != null) {
                    CustomTaskStatus predStatus = customTaskStatusRepository.findById(predecessor.getCurrentStatusId()).orElse(null);
                    if (predStatus != null && !"COMPLETED".equalsIgnoreCase(predStatus.getCategory())) {
                        throw new IllegalArgumentException("Cannot complete task due to unfinished predecessor task: " + predecessor.getTitle());
                    }
                }
            }
        }
    }

    @Transactional(readOnly = true)
    public Integer calculateTimeInStatus(UUID taskId, UUID statusId) {
        List<StatusHistory> history = statusHistoryRepository.findByTaskIdOrderByChangedAtDesc(taskId);
        if (history.isEmpty()) return null;

        // Find the history entry where status was changed TO the specified statusId
        StatusHistory entry = history.stream()
                .filter(h -> statusId.equals(h.getToStatusId()))
                .findFirst()
                .orElse(null);

        if (entry == null) return null;

        // Duration is from entry.changedAt until now or until the next history entry
        Instant start = entry.getChangedAt();
        Instant end = Instant.now();

        // Find if there was any subsequent transition
        StatusHistory subsequent = null;
        for (StatusHistory h : history) {
            if (h.getChangedAt().isAfter(start) && statusId.equals(h.getFromStatusId())) {
                if (subsequent == null || h.getChangedAt().isBefore(subsequent.getChangedAt())) {
                    subsequent = h;
                }
            }
        }

        if (subsequent != null) {
            end = subsequent.getChangedAt();
        }

        return (int) Duration.between(start, end).toMinutes();
    }

    public void executeTransitionActions(Task task, CustomTaskStatus fromStatus, CustomTaskStatus toStatus) {
        if (fromStatus == null) return;
        statusTransitionRepository.findByFromStatusIdAndToStatusId(fromStatus.getId(), toStatus.getId())
                .ifPresent(transition -> {
                    if (transition.getWebhookUrl() != null && !transition.getWebhookUrl().trim().isEmpty()) {
                        try {
                            Map<String, Object> payload = new HashMap<>();
                            payload.put("taskId", task.getId());
                            payload.put("projectId", task.getProjectId());
                            payload.put("oldStatus", fromStatus.getName());
                            payload.put("newStatus", toStatus.getName());
                            payload.put("timestamp", Instant.now().toString());

                            restTemplate.postForLocation(transition.getWebhookUrl(), payload);
                            log.info("Transition webhook triggered successfully for task {}", task.getId());
                        } catch (Exception e) {
                            log.error("Failed to trigger transition webhook: {}", e.getMessage());
                        }
                    }
                });
    }

    private boolean canUserPerformTransition(UUID userId, Task task, StatusTransition transition) {
        if (transition.getAllowedRole() == null || transition.getAllowedRole().trim().isEmpty()) {
            return true;
        }

        int actorProjectLevel = roleHierarchyService.getUserRoleInProject(userId, task.getProjectId());
        int requiredLevel = mapRoleNameToLevel(transition.getAllowedRole());

        return actorProjectLevel >= requiredLevel;
    }

    private int mapRoleNameToLevel(String roleName) {
        if (roleName == null) return 2;
        switch (roleName.toUpperCase()) {
            case "PROJECT_OWNER":
                return 5;
            case "PROJECT_ADMIN":
                return 4;
            case "PROJECT_MANAGER":
                return 3;
            case "PROJECT_MEMBER":
                return 2;
            case "PROJECT_VIEWER":
                return 1;
            case "PROJECT_GUEST":
                return 0;
            default:
                return 2;
        }
    }
}
