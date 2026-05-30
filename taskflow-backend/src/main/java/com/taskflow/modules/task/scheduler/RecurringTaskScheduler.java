package com.taskflow.modules.task.scheduler;

import com.taskflow.modules.task.domain.RecurringTask;
import com.taskflow.modules.task.domain.Task;
import com.taskflow.modules.task.dto.TaskRequest;
import com.taskflow.modules.task.repository.RecurringTaskRepository;
import com.taskflow.modules.task.repository.TaskRepository;
import com.taskflow.modules.task.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import com.taskflow.common.security.AuthenticatedUser;

import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
public class RecurringTaskScheduler {

    private static final Logger log = LoggerFactory.getLogger(RecurringTaskScheduler.class);

    private final RecurringTaskRepository recurringTaskRepository;
    private final TaskRepository taskRepository;
    private final TaskService taskService;

    @Scheduled(cron = "0 0 * * * *") // Runs every hour at minute 0
    @Transactional
    public void processRecurringTasks() {
        log.info("Starting recurring task generation cycle...");
        Instant now = Instant.now();
        List<RecurringTask> dueTasks = recurringTaskRepository.findByIsActiveTrueAndNextRunAtLessThanEqual(now);

        for (RecurringTask recurring : dueTasks) {
            try {
                Task template = taskRepository.findById(recurring.getTemplateTaskId()).orElse(null);
                if (template != null) {
                    // Mock Security Context
                    AuthenticatedUser systemUser = AuthenticatedUser.builder()
                            .id(template.getCreatedBy())
                            .orgId(template.getOrganizationId())
                            .role("SYSTEM")
                            .build();
                    SecurityContextHolder.getContext().setAuthentication(
                            new UsernamePasswordAuthenticationToken(systemUser, null, List.of())
                    );

                    // Create a copy via TaskRequest
                    TaskRequest req = new TaskRequest();
                    req.setProjectId(template.getProjectId());
                    req.setStatusId(template.getStatusId());
                    req.setTaskType(template.getTaskType());
                    req.setDepartmentId(template.getDepartmentId());
                    req.setTeamId(template.getTeamId());
                    req.setTitle(template.getTitle() + " (" + now.toString().substring(0, 10) + ")");
                    req.setDescription(template.getDescription());
                    req.setPriority(template.getPriority());
                    req.setStoryPoints(template.getStoryPoints());

                    taskService.createTask(req);
                    log.info("Created recurring task from template {}", template.getId());
                    SecurityContextHolder.clearContext();
                }

                // Update next run
                recurring.setLastRunAt(now);
                if ("MONTHLY".equalsIgnoreCase(recurring.getCronExpression())) {
                    recurring.setNextRunAt(now.plus(java.time.Duration.ofDays(30)));
                } else {
                    recurring.setNextRunAt(now.plus(java.time.Duration.ofDays(7)));
                }
                recurringTaskRepository.save(recurring);
            } catch (Exception e) {
                log.error("Failed to process recurring task {}: {}", recurring.getId(), e.getMessage());
            }
        }
    }
}
