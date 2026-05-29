package com.taskflow.modules.task.controller;

import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.task.domain.CustomTaskStatus;
import com.taskflow.modules.task.domain.StatusHistory;
import com.taskflow.modules.task.domain.StatusTransition;
import com.taskflow.modules.task.domain.Task;
import com.taskflow.modules.task.repository.CustomTaskStatusRepository;
import com.taskflow.modules.task.repository.StatusHistoryRepository;
import com.taskflow.modules.task.repository.StatusTransitionRepository;
import com.taskflow.modules.task.repository.TaskRepository;
import com.taskflow.modules.task.service.StatusWorkflowService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
public class StatusWorkflowController {

    private final StatusWorkflowService statusWorkflowService;
    private final CustomTaskStatusRepository customTaskStatusRepository;
    private final StatusTransitionRepository statusTransitionRepository;
    private final StatusHistoryRepository statusHistoryRepository;
    private final TaskRepository taskRepository;

    public StatusWorkflowController(StatusWorkflowService statusWorkflowService,
                                    CustomTaskStatusRepository customTaskStatusRepository,
                                    StatusTransitionRepository statusTransitionRepository,
                                    StatusHistoryRepository statusHistoryRepository,
                                    TaskRepository taskRepository) {
        this.statusWorkflowService = statusWorkflowService;
        this.customTaskStatusRepository = customTaskStatusRepository;
        this.statusTransitionRepository = statusTransitionRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.taskRepository = taskRepository;
    }

    @GetMapping("/statuses/available/{taskId}")
    public ResponseEntity<List<CustomTaskStatus>> getAvailableTransitions(@PathVariable UUID taskId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(statusWorkflowService.getAvailableTransitions(taskId, userId));
    }

    @PostMapping("/tasks/{id}/status")
    public ResponseEntity<Task> transitionStatus(@PathVariable UUID id, @RequestBody TransitionStatusRequest request) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        Task task = statusWorkflowService.transitionStatus(id, request.getNewStatusId(), userId, request.getComment());
        return ResponseEntity.ok(task);
    }

    @GetMapping("/statuses/history/{taskId}")
    public ResponseEntity<List<StatusHistory>> getStatusHistory(@PathVariable UUID taskId) {
        return ResponseEntity.ok(statusHistoryRepository.findByTaskIdOrderByChangedAtDesc(taskId));
    }

    @PostMapping("/projects/{id}/statuses")
    public ResponseEntity<CustomTaskStatus> addCustomStatusToProject(@PathVariable UUID id, @RequestBody CustomStatusRequest request) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            return ResponseEntity.status(401).build();
        }

        CustomTaskStatus status = CustomTaskStatus.builder()
                .id(UUID.randomUUID())
                .organizationId(orgId)
                .projectId(id)
                .departmentId(request.getDepartmentId())
                .name(request.getName())
                .category(request.getCategory())
                .color(request.getColor())
                .sortOrder(request.getSortOrder())
                .isDefault(request.isDefault())
                .requiresComment(request.isRequiresComment())
                .requiresApproval(request.isRequiresApproval())
                .autoTransitionDays(request.getAutoTransitionDays())
                .transitionToOnAuto(request.getTransitionToOnAuto())
                .build();

        return ResponseEntity.ok(customTaskStatusRepository.save(status));
    }

    @PutMapping("/statuses/transitions")
    public ResponseEntity<StatusTransition> configureTransitionRules(@RequestBody ConfigureTransitionRequest request) {
        Optional<StatusTransition> existing = statusTransitionRepository
                .findByFromStatusIdAndToStatusId(request.getFromStatusId(), request.getToStatusId());
        
        StatusTransition trans;
        if (existing.isPresent()) {
            trans = existing.get();
            trans.setAllowedRole(request.getAllowedRole());
            trans.setRequiresApproval(request.isRequiresApproval());
            trans.setApprovalRole(request.getApprovalRole());
            trans.setWebhookUrl(request.getWebhookUrl());
        } else {
            trans = StatusTransition.builder()
                    .id(UUID.randomUUID())
                    .fromStatusId(request.getFromStatusId())
                    .toStatusId(request.getToStatusId())
                    .allowedRole(request.getAllowedRole())
                    .requiresApproval(request.isRequiresApproval())
                    .approvalRole(request.getApprovalRole())
                    .webhookUrl(request.getWebhookUrl())
                    .build();
        }

        return ResponseEntity.ok(statusTransitionRepository.save(trans));
    }

    @GetMapping("/statuses/analytics")
    public ResponseEntity<Map<String, Object>> getCycleTimeAnalytics() {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            return ResponseEntity.status(401).build();
        }

        // Aggregate cycle time analytics
        List<StatusHistory> histories = statusHistoryRepository.findAll().stream()
                .filter(h -> h.getTimeInStatusMinutes() != null)
                .collect(Collectors.toList());

        Map<String, List<Integer>> durationMap = new HashMap<>();

        for (StatusHistory h : histories) {
            CustomTaskStatus status = customTaskStatusRepository.findById(h.getToStatusId()).orElse(null);
            if (status != null && orgId.equals(status.getOrganizationId())) {
                durationMap.computeIfAbsent(status.getName(), k -> new ArrayList<>())
                        .add(h.getTimeInStatusMinutes());
            }
        }

        Map<String, Object> analytics = new HashMap<>();
        Map<String, Double> averageTimes = new HashMap<>();

        for (Map.Entry<String, List<Integer>> entry : durationMap.entrySet()) {
            double avg = entry.getValue().stream().mapToInt(Integer::intValue).average().orElse(0.0);
            averageTimes.put(entry.getKey(), avg);
        }

        analytics.put("averageMinutesPerStatus", averageTimes);
        analytics.put("totalTransitionsAnalyzed", histories.size());

        return ResponseEntity.ok(analytics);
    }

    @Data
    public static class TransitionStatusRequest {
        private UUID newStatusId;
        private String comment;
    }

    @Data
    public static class CustomStatusRequest {
        private UUID departmentId;
        private String name;
        private String category;
        private String color;
        private int sortOrder;
        private boolean isDefault;
        private boolean requiresComment;
        private boolean requiresApproval;
        private Integer autoTransitionDays;
        private UUID transitionToOnAuto;
    }

    @Data
    public static class ConfigureTransitionRequest {
        private UUID fromStatusId;
        private UUID toStatusId;
        private String allowedRole;
        private boolean requiresApproval;
        private String approvalRole;
        private String webhookUrl;
    }
}
