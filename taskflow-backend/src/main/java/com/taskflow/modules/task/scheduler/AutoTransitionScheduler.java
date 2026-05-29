package com.taskflow.modules.task.scheduler;

import com.taskflow.modules.task.domain.CustomTaskStatus;
import com.taskflow.modules.task.domain.StatusHistory;
import com.taskflow.modules.task.domain.Task;
import com.taskflow.modules.task.repository.CustomTaskStatusRepository;
import com.taskflow.modules.task.repository.StatusHistoryRepository;
import com.taskflow.modules.task.repository.TaskRepository;
import com.taskflow.modules.task.service.StatusWorkflowService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class AutoTransitionScheduler {

    private static final Logger log = LoggerFactory.getLogger(AutoTransitionScheduler.class);

    private final TaskRepository taskRepository;
    private final CustomTaskStatusRepository customTaskStatusRepository;
    private final StatusHistoryRepository statusHistoryRepository;
    private final StatusWorkflowService statusWorkflowService;

    public AutoTransitionScheduler(TaskRepository taskRepository,
                                   CustomTaskStatusRepository customTaskStatusRepository,
                                   StatusHistoryRepository statusHistoryRepository,
                                   StatusWorkflowService statusWorkflowService) {
        this.taskRepository = taskRepository;
        this.customTaskStatusRepository = customTaskStatusRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.statusWorkflowService = statusWorkflowService;
    }

    @Scheduled(cron = "0 0 * * * *") // Run hourly
    @Transactional
    public void evaluateAutoTransitions() {
        log.info("Starting Auto-Transition evaluation cycle...");

        // Load all custom status rules with autoTransitionDays
        List<CustomTaskStatus> rules = customTaskStatusRepository.findAll().stream()
                .filter(s -> s.getAutoTransitionDays() != null && s.getTransitionToOnAuto() != null)
                .collect(java.util.stream.Collectors.toList());

        for (CustomTaskStatus rule : rules) {
            List<Task> tasksInStatus = taskRepository.findByProjectIdAndDeletedAtIsNull(rule.getProjectId()).stream()
                    .filter(t -> rule.getId().equals(t.getCurrentStatusId()))
                    .collect(java.util.stream.Collectors.toList());

            for (Task task : tasksInStatus) {
                // Find when the task entered this status
                List<StatusHistory> history = statusHistoryRepository.findByTaskIdOrderByChangedAtDesc(task.getId());
                Instant statusEnteredAt = task.getCreatedAt(); // Default fallback

                if (!history.isEmpty()) {
                    // Find the most recent entry where it transitioned to this status
                    StatusHistory entry = history.stream()
                            .filter(h -> rule.getId().equals(h.getToStatusId()))
                            .findFirst()
                            .orElse(null);
                    if (entry != null) {
                        statusEnteredAt = entry.getChangedAt();
                    }
                }

                long daysInStatus = ChronoUnit.DAYS.between(statusEnteredAt, Instant.now());
                if (daysInStatus >= rule.getAutoTransitionDays()) {
                    try {
                        log.info("Auto-transitioning task {} from status {} to {} (stale for {} days)",
                                task.getId(), rule.getName(), rule.getTransitionToOnAuto(), daysInStatus);
                        
                        // Perform the auto transition using a system fallback actor ID (represented as its creator or itself)
                        statusWorkflowService.transitionStatus(
                                task.getId(),
                                rule.getTransitionToOnAuto(),
                                task.getCreatedBy(),
                                "Auto-transition triggered after " + daysInStatus + " days in " + rule.getName()
                        );
                    } catch (Exception e) {
                        log.error("Failed to auto-transition task {}: {}", task.getId(), e.getMessage());
                    }
                }
            }
        }
    }
}
