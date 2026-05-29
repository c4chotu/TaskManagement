package com.taskflow.modules.task.service;

import com.taskflow.common.exception.EntityNotFoundException;
import com.taskflow.modules.auth.service.RoleHierarchyService;
import com.taskflow.modules.task.domain.Task;
import com.taskflow.modules.task.repository.TaskAssignmentRepository;
import com.taskflow.modules.task.repository.TaskRepository;
import com.taskflow.modules.user.domain.TeamMember;
import com.taskflow.modules.user.repository.TeamMemberRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class WorkloadBalancerService {

    private static final Logger log = LoggerFactory.getLogger(WorkloadBalancerService.class);

    private final TaskRepository taskRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final RoleHierarchyService roleHierarchyService;

    public WorkloadBalancerService(TaskRepository taskRepository,
                                  TaskAssignmentRepository taskAssignmentRepository,
                                  TeamMemberRepository teamMemberRepository,
                                  RoleHierarchyService roleHierarchyService) {
        this.taskRepository = taskRepository;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.roleHierarchyService = roleHierarchyService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getUserWorkload(UUID userId) {
        List<Task> activeTasks = getActiveTasksForUser(userId);

        long openCount = activeTasks.size();
        int totalStoryPoints = activeTasks.stream()
                .mapToInt(t -> t.getStoryPoints() != null ? t.getStoryPoints() : 0)
                .sum();
        
        // 1 story point = 8 estimated hours
        int estimatedHours = totalStoryPoints * 8;

        Map<String, Object> workload = new HashMap<>();
        workload.put("userId", userId);
        workload.put("activeTasksCount", openCount);
        workload.put("totalStoryPoints", totalStoryPoints);
        workload.put("estimatedHours", estimatedHours);

        // Capacity checks
        UUID orgId = activeTasks.isEmpty() ? null : activeTasks.get(0).getOrganizationId();
        int roleLevel = orgId != null ? roleHierarchyService.getUserEffectiveRole(userId, orgId) : 1;
        int maxTasks = getMaxTasksForRole(roleLevel);
        int maxHours = getMaxHoursForRole(roleLevel);

        workload.put("capacityMaxTasks", maxTasks);
        workload.put("capacityMaxHours", maxHours);
        workload.put("isOverloaded", openCount > maxTasks || estimatedHours > maxHours);
        workload.put("utilizationPercentage", maxTasks > 0 ? (openCount * 100.0 / maxTasks) : 0.0);

        return workload;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getTeamWorkload(UUID teamId) {
        List<TeamMember> members = teamMemberRepository.findByTeamId(teamId);
        List<Map<String, Object>> memberWorkloads = members.stream()
                .map(m -> getUserWorkload(m.getUserId()))
                .collect(Collectors.toList());

        long teamActiveTasks = memberWorkloads.stream()
                .mapToLong(w -> (long) w.get("activeTasksCount"))
                .sum();

        int teamEstimatedHours = memberWorkloads.stream()
                .mapToInt(w -> (int) w.get("estimatedHours"))
                .sum();

        int teamCapacityTasks = memberWorkloads.stream()
                .mapToInt(w -> (int) w.get("capacityMaxTasks"))
                .sum();

        Map<String, Object> workload = new HashMap<>();
        workload.put("teamId", teamId);
        workload.put("memberWorkloads", memberWorkloads);
        workload.put("totalActiveTasks", teamActiveTasks);
        workload.put("totalEstimatedHours", teamEstimatedHours);
        workload.put("totalCapacityTasks", teamCapacityTasks);
        workload.put("isTeamOverloaded", teamCapacityTasks > 0 && teamActiveTasks > (teamCapacityTasks * 1.2)); // Exceeds 120% capacity

        return workload;
    }

    @Transactional(readOnly = true)
    public boolean canAcceptTask(UUID userId, Task newTask) {
        Map<String, Object> workload = getUserWorkload(userId);
        long activeCount = (long) workload.get("activeTasksCount");
        int maxTasks = (int) workload.get("capacityMaxTasks");

        return activeCount < maxTasks;
    }

    @Transactional
    public List<Task> reassignOverloaded(UUID userId) {
        Map<String, Object> workload = getUserWorkload(userId);
        boolean isOverloaded = (boolean) workload.get("isOverloaded");
        if (!isOverloaded) {
            return Collections.emptyList();
        }

        List<Task> activeTasks = getActiveTasksForUser(userId);
        if (activeTasks.isEmpty()) {
            return Collections.emptyList();
        }

        // Reassign the tasks that exceed capacity.
        // Try to find another team member in the same team who has capacity.
        List<Task> reassignedTasks = new ArrayList<>();
        UUID taskId = activeTasks.get(0).getId(); // Get first task
        
        // Find the team
        UUID teamId = activeTasks.get(0).getTeamId();
        if (teamId == null) {
            return Collections.emptyList();
        }

        List<TeamMember> members = teamMemberRepository.findByTeamId(teamId);
        for (Task task : activeTasks) {
            Map<String, Object> currentWorkload = getUserWorkload(userId);
            long count = (long) currentWorkload.get("activeTasksCount");
            int max = (int) currentWorkload.get("capacityMaxTasks");
            if (count <= max) {
                break; // No longer overloaded!
            }

            // Find a team member who is not overloaded and has capacity
            for (TeamMember member : members) {
                if (member.getUserId().equals(userId)) continue;

                Map<String, Object> memberW = getUserWorkload(member.getUserId());
                long memberCount = (long) memberW.get("activeTasksCount");
                int memberMax = (int) memberW.get("capacityMaxTasks");

                if (memberCount < memberMax) {
                    // Reassign task to this member
                    taskAssignmentRepository.deleteByTaskIdAndUserId(task.getId(), userId);
                    com.taskflow.modules.task.domain.TaskAssignment assignment = com.taskflow.modules.task.domain.TaskAssignment.builder()
                            .id(UUID.randomUUID())
                            .taskId(task.getId())
                            .userId(member.getUserId())
                            .role("ASSIGNEE")
                            .build();
                    taskAssignmentRepository.save(assignment);
                    
                    log.info("Reassigned task {} from overloaded user {} to {}", task.getId(), userId, member.getUserId());
                    reassignedTasks.add(task);
                    break;
                }
            }
        }

        return reassignedTasks;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> predictWorkload(UUID userId, int days) {
        Map<String, Object> workload = getUserWorkload(userId);
        long activeCount = (long) workload.get("activeTasksCount");

        // Simple forecast: active count + 1 new task every 3 days - 1 completed task every 2 days
        double predictedActiveCount = activeCount + (days / 3.0) - (days / 2.0);
        if (predictedActiveCount < 0) {
            predictedActiveCount = 0;
        }

        Map<String, Object> prediction = new HashMap<>();
        prediction.put("userId", userId);
        prediction.put("forecastDays", days);
        prediction.put("predictedActiveTasks", Math.round(predictedActiveCount));
        prediction.put("trend", predictedActiveCount < activeCount ? "DECREASING" : "INCREASING");

        return prediction;
    }

    private List<Task> getActiveTasksForUser(UUID userId) {
        return taskAssignmentRepository.findAll().stream()
                .filter(a -> userId.equals(a.getUserId()))
                .map(a -> taskRepository.findById(a.getTaskId()).orElse(null))
                .filter(t -> t != null && t.getDeletedAt() == null)
                .collect(Collectors.toList());
    }

    private int getMaxTasksForRole(int roleLevel) {
        switch (roleLevel) {
            case 5: // ORG_OWNER
            case 4: // ORG_ADMIN
                return 0; // Owner/Admin don't get direct assignments
            case 3: // DEPT_HEAD
                return 3;
            case 2: // TEAM_LEAD
                return 5;
            case 1: // TEAM_MEMBER
                return 10;
            case 0: // GUEST
            default:
                return 0;
        }
    }

    private int getMaxHoursForRole(int roleLevel) {
        switch (roleLevel) {
            case 5:
            case 4:
                return 0;
            case 3:
                return 10;
            case 2:
                return 20;
            case 1:
                return 40;
            case 0:
            default:
                return 0;
        }
    }
}
