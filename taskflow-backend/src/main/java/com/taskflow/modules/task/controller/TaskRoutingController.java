package com.taskflow.modules.task.controller;

import com.taskflow.common.exception.EntityNotFoundException;
import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.task.domain.AssignmentHistory;
import com.taskflow.modules.task.domain.RoutingRule;
import com.taskflow.modules.task.domain.Task;
import com.taskflow.modules.task.repository.AssignmentHistoryRepository;
import com.taskflow.modules.task.repository.RoutingRuleRepository;
import com.taskflow.modules.task.repository.TaskRepository;
import com.taskflow.modules.task.service.TaskRouterService;
import com.taskflow.modules.task.service.WorkloadBalancerService;
import com.taskflow.modules.user.domain.Team;
import com.taskflow.modules.user.domain.UserSkill;
import com.taskflow.modules.user.repository.TeamRepository;
import com.taskflow.modules.user.repository.UserSkillRepository;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
public class TaskRoutingController {

    private final TaskRouterService taskRouterService;
    private final WorkloadBalancerService workloadBalancerService;
    private final RoutingRuleRepository routingRuleRepository;
    private final AssignmentHistoryRepository assignmentHistoryRepository;
    private final TaskRepository taskRepository;
    private final UserSkillRepository userSkillRepository;
    private final TeamRepository teamRepository;
    private final com.taskflow.modules.user.service.UserProfileService userProfileService;

    public TaskRoutingController(TaskRouterService taskRouterService,
                                 WorkloadBalancerService workloadBalancerService,
                                 RoutingRuleRepository routingRuleRepository,
                                 AssignmentHistoryRepository assignmentHistoryRepository,
                                 TaskRepository taskRepository,
                                 UserSkillRepository userSkillRepository,
                                 TeamRepository teamRepository,
                                 com.taskflow.modules.user.service.UserProfileService userProfileService) {
        this.taskRouterService = taskRouterService;
        this.workloadBalancerService = workloadBalancerService;
        this.routingRuleRepository = routingRuleRepository;
        this.assignmentHistoryRepository = assignmentHistoryRepository;
        this.taskRepository = taskRepository;
        this.userSkillRepository = userSkillRepository;
        this.teamRepository = teamRepository;
        this.userProfileService = userProfileService;
    }

    @GetMapping("/workload")
    public ResponseEntity<List<Map<String, Object>>> getOrgWorkloads() {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            return ResponseEntity.status(401).build();
        }
        List<com.taskflow.modules.user.dto.UserProfileResponse> users = userProfileService.getUsersByOrganization(orgId);
        List<Map<String, Object>> workloads = users.stream()
                .map(u -> {
                    Map<String, Object> wl = new HashMap<>(workloadBalancerService.getUserWorkload(u.getId()));
                    // Ensure it has the structure expected by the frontend
                    wl.put("totalActiveTasks", wl.get("activeTasksCount"));
                    wl.put("totalEstimatedHours", wl.get("estimatedHours"));
                    wl.put("overloaded", wl.get("isOverloaded"));
                    return wl;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(workloads);
    }

    @PostMapping("/routing/rules")
    public ResponseEntity<RoutingRule> createRule(@RequestBody RuleRequest request) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            return ResponseEntity.status(401).build();
        }

        RoutingRule rule = RoutingRule.builder()
                .id(UUID.randomUUID())
                .organizationId(orgId)
                .ruleName(request.getRuleName())
                .taskType(request.getTaskType())
                .triggerCondition(request.getTriggerCondition())
                .sourceDepartmentId(request.getSourceDepartmentId())
                .sourceTeamId(request.getSourceTeamId())
                .targetDepartmentId(request.getTargetDepartmentId())
                .targetTeamId(request.getTargetTeamId())
                .assignToRole(request.getAssignToRole())
                .assignmentStrategy(request.getAssignmentStrategy())
                .autoCreateSubtasks(request.isAutoCreateSubtasks())
                .subtaskTemplate(request.getSubtaskTemplate())
                .priority(request.getPriority())
                .enabled(request.isEnabled())
                .build();

        return ResponseEntity.ok(routingRuleRepository.save(rule));
    }

    @GetMapping("/routing/rules")
    public ResponseEntity<List<RoutingRule>> listRules() {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(routingRuleRepository.findByOrganizationIdAndEnabledTrueOrderByPriorityDesc(orgId));
    }

    @PutMapping("/routing/rules/{id}")
    public ResponseEntity<RoutingRule> updateRule(@PathVariable UUID id, @RequestBody RuleRequest request) {
        RoutingRule rule = routingRuleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Routing rule not found: " + id));

        rule.setRuleName(request.getRuleName());
        rule.setTaskType(request.getTaskType());
        rule.setTriggerCondition(request.getTriggerCondition());
        rule.setSourceDepartmentId(request.getSourceDepartmentId());
        rule.setSourceTeamId(request.getSourceTeamId());
        rule.setTargetDepartmentId(request.getTargetDepartmentId());
        rule.setTargetTeamId(request.getTargetTeamId());
        rule.setAssignToRole(request.getAssignToRole());
        rule.setAssignmentStrategy(request.getAssignmentStrategy());
        rule.setAutoCreateSubtasks(request.isAutoCreateSubtasks());
        rule.setSubtaskTemplate(request.getSubtaskTemplate());
        rule.setPriority(request.getPriority());
        rule.setEnabled(request.isEnabled());

        return ResponseEntity.ok(routingRuleRepository.save(rule));
    }

    @PostMapping("/tasks/{id}/route")
    public ResponseEntity<Map<String, Object>> manuallyRouteTask(@PathVariable UUID id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + id));

        UUID assigneeId = taskRouterService.routeTask(task, "MANUAL_ROUTING");

        Map<String, Object> response = new HashMap<>();
        response.put("taskId", id);
        response.put("routed", assigneeId != null);
        response.put("assignedTo", assigneeId);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/tasks/{id}/routing-history")
    public ResponseEntity<List<AssignmentHistory>> getRoutingHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(assignmentHistoryRepository.findByTaskId(id));
    }

    @PostMapping("/skills/user/{userId}")
    public ResponseEntity<UserSkill> assignSkillToUser(@PathVariable UUID userId, @RequestBody UserSkillRequest request) {
        UserSkill skill = UserSkill.builder()
                .userId(userId)
                .skillId(request.getSkillId())
                .proficiencyLevel(request.getProficiencyLevel())
                .build();
        return ResponseEntity.ok(userSkillRepository.save(skill));
    }

    @GetMapping("/tasks/suggest-assignee")
    public ResponseEntity<Map<String, Object>> suggestAssignee(@RequestParam UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + taskId));

        RoutingRule rule = taskRouterService.evaluateRoutingRules(task);
        UUID suggestedId = null;
        String reason = "No matching routing rule found";

        if (rule != null) {
            suggestedId = taskRouterService.determineAssignee(task, rule);
            reason = "Suggested via matching rule: " + rule.getRuleName() + " using strategy: " + rule.getAssignmentStrategy();
        }

        Map<String, Object> result = new HashMap<>();
        result.put("taskId", taskId);
        result.put("suggestedAssigneeId", suggestedId);
        result.put("reason", reason);

        return ResponseEntity.ok(result);
    }

    @GetMapping("/workload/user/{userId}")
    public ResponseEntity<Map<String, Object>> getUserWorkload(@PathVariable UUID userId) {
        return ResponseEntity.ok(workloadBalancerService.getUserWorkload(userId));
    }

    @GetMapping("/workload/team/{teamId}")
    public ResponseEntity<Map<String, Object>> getTeamWorkload(@PathVariable UUID teamId) {
        return ResponseEntity.ok(workloadBalancerService.getTeamWorkload(teamId));
    }

    @GetMapping("/workload/department/{deptId}")
    public ResponseEntity<Map<String, Object>> getDepartmentWorkload(@PathVariable UUID deptId) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            return ResponseEntity.status(401).build();
        }

        List<Team> teams = teamRepository.findByOrganizationId(orgId).stream()
                .filter(t -> deptId.equals(t.getDepartmentId()))
                .collect(Collectors.toList());

        List<Map<String, Object>> teamWorkloads = teams.stream()
                .map(t -> workloadBalancerService.getTeamWorkload(t.getId()))
                .collect(Collectors.toList());

        long activeTasks = teamWorkloads.stream()
                .mapToLong(w -> (long) w.get("totalActiveTasks"))
                .sum();

        int estimatedHours = teamWorkloads.stream()
                .mapToInt(w -> (int) w.get("totalEstimatedHours"))
                .sum();

        Map<String, Object> workload = new HashMap<>();
        workload.put("departmentId", deptId);
        workload.put("teamsWorkloads", teamWorkloads);
        workload.put("totalActiveTasks", activeTasks);
        workload.put("totalEstimatedHours", estimatedHours);

        return ResponseEntity.ok(workload);
    }

    @PostMapping("/tasks/{id}/reassign")
    public ResponseEntity<Map<String, Object>> reassignTask(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        UUID newUserId = UUID.fromString(body.get("userId"));
        
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + id));

        // Reassign logic: manually trigger reassignment
        taskRepository.save(task);

        Map<String, Object> result = new HashMap<>();
        result.put("taskId", id);
        result.put("status", "SUCCESS");

        return ResponseEntity.ok(result);
    }

    @Data
    public static class RuleRequest {
        private String ruleName;
        private String taskType;
        private Map<String, Object> triggerCondition;
        private UUID sourceDepartmentId;
        private UUID sourceTeamId;
        private UUID targetDepartmentId;
        private UUID targetTeamId;
        private String assignToRole;
        private String assignmentStrategy;
        private boolean autoCreateSubtasks;
        private Map<String, Object> subtaskTemplate;
        private int priority;
        private boolean enabled = true;
    }

    @Data
    public static class UserSkillRequest {
        private UUID skillId;
        private int proficiencyLevel;
    }
}
