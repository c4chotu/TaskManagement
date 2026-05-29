package com.taskflow.modules.task.service;

import com.taskflow.common.exception.EntityNotFoundException;
import com.taskflow.modules.task.domain.*;
import com.taskflow.modules.task.repository.*;
import com.taskflow.modules.user.domain.TeamMember;
import com.taskflow.modules.user.domain.UserSkill;
import com.taskflow.modules.user.repository.TeamMemberRepository;
import com.taskflow.modules.user.repository.UserSkillRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TaskRouterService {

    private static final Logger log = LoggerFactory.getLogger(TaskRouterService.class);

    private final RoutingRuleRepository routingRuleRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final AssignmentHistoryRepository assignmentHistoryRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final TaskRepository taskRepository;
    private final UserSkillRepository userSkillRepository;
    private final TaskSkillRequirementRepository taskSkillRequirementRepository;
    private final OnCallScheduleRepository onCallScheduleRepository;

    public TaskRouterService(RoutingRuleRepository routingRuleRepository,
                             TeamMemberRepository teamMemberRepository,
                             AssignmentHistoryRepository assignmentHistoryRepository,
                             TaskAssignmentRepository taskAssignmentRepository,
                             TaskRepository taskRepository,
                             UserSkillRepository userSkillRepository,
                             TaskSkillRequirementRepository taskSkillRequirementRepository,
                             OnCallScheduleRepository onCallScheduleRepository) {
        this.routingRuleRepository = routingRuleRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.assignmentHistoryRepository = assignmentHistoryRepository;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.taskRepository = taskRepository;
        this.userSkillRepository = userSkillRepository;
        this.taskSkillRequirementRepository = taskSkillRequirementRepository;
        this.onCallScheduleRepository = onCallScheduleRepository;
    }

    @Transactional
    public UUID routeTask(Task task, String triggerEvent) {
        log.info("Evaluating routing rules for task {}, trigger: {}", task.getId(), triggerEvent);
        RoutingRule matchedRule = evaluateRoutingRules(task);
        if (matchedRule == null) {
            log.info("No routing rule matched task {}", task.getId());
            return null;
        }

        log.info("Matched routing rule: {} for task {}", matchedRule.getRuleName(), task.getId());

        // Update task department and team if specified by the rule
        if (matchedRule.getTargetDepartmentId() != null) {
            task.setDepartmentId(matchedRule.getTargetDepartmentId());
        }
        if (matchedRule.getTargetTeamId() != null) {
            task.setTeamId(matchedRule.getTargetTeamId());
        }
        taskRepository.save(task);

        // Determine assignee
        UUID assigneeId = determineAssignee(task, matchedRule);
        if (assigneeId != null) {
            // Check if already assigned
            boolean alreadyAssigned = taskAssignmentRepository.findByTaskId(task.getId()).stream()
                    .anyMatch(a -> assigneeId.equals(a.getUserId()));
            
            if (!alreadyAssigned) {
                TaskAssignment assignment = TaskAssignment.builder()
                        .id(UUID.randomUUID())
                        .taskId(task.getId())
                        .userId(assigneeId)
                        .role("ASSIGNEE")
                        .build();
                taskAssignmentRepository.save(assignment);

                // Log routing in history
                AssignmentHistory hist = AssignmentHistory.builder()
                        .id(UUID.randomUUID())
                        .taskId(task.getId())
                        .assignedTo(assigneeId)
                        .assignedBy(task.getCreatedBy() != null ? task.getCreatedBy() : assigneeId)
                        .assignedAt(Instant.now())
                        .assignmentReason("AUTO_ROUTING")
                        .routingRuleId(matchedRule.getId())
                        .build();
                assignmentHistoryRepository.save(hist);

                log.info("Task {} auto-assigned to user {} via strategy {}", task.getId(), assigneeId, matchedRule.getAssignmentStrategy());
            }
        }

        // Auto create subtasks if configured
        if (matchedRule.isAutoCreateSubtasks() && matchedRule.getSubtaskTemplate() != null) {
            autoCreateSubtasks(task, matchedRule.getSubtaskTemplate());
        }

        return assigneeId;
    }

    public RoutingRule evaluateRoutingRules(Task task) {
        List<RoutingRule> rules = routingRuleRepository.findByOrganizationIdAndEnabledTrueOrderByPriorityDesc(task.getOrganizationId());

        for (RoutingRule rule : rules) {
            // Check task type match (case-insensitive)
            if (!rule.getTaskType().equalsIgnoreCase(task.getTaskType())) {
                continue;
            }

            // Evaluate conditions (priority, etc.)
            Map<String, Object> cond = rule.getTriggerCondition();
            if (cond != null && !cond.isEmpty()) {
                String field = (String) cond.get("field");
                String operator = (String) cond.get("operator");
                Object value = cond.get("value");

                if ("priority".equalsIgnoreCase(field)) {
                    if ("=".equals(operator) && !Objects.equals(task.getPriority(), value)) {
                        continue;
                    }
                }
            }

            // Check source department/team match if specified
            if (rule.getSourceDepartmentId() != null && !rule.getSourceDepartmentId().equals(task.getDepartmentId())) {
                continue;
            }
            if (rule.getSourceTeamId() != null && !rule.getSourceTeamId().equals(task.getTeamId())) {
                continue;
            }

            return rule;
        }

        return null;
    }

    public UUID determineAssignee(Task task, RoutingRule rule) {
        String strategy = rule.getAssignmentStrategy();
        UUID teamId = rule.getTargetTeamId();

        if (teamId == null) {
            log.warn("Target team is null for routing rule {}, cannot route automatically.", rule.getId());
            return null;
        }

        switch (strategy.toUpperCase()) {
            case "ROUND_ROBIN":
                return getRoundRobinUser(teamId);
            case "LEAST_BUSY":
                List<TaskSkillRequirement> reqs = taskSkillRequirementRepository.findByTaskId(task.getId());
                return getLeastBusyUser(teamId, reqs);
            case "SKILL_MATCH":
                List<TaskSkillRequirement> skillsReq = taskSkillRequirementRepository.findByTaskId(task.getId());
                return getSkillMatchUser(teamId, skillsReq);
            case "ON_CALL":
                LocalDate today = LocalDate.now();
                LocalDate weekStart = today.with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                return onCallScheduleRepository.findByOrganizationIdAndWeekStartDateAndCoverageType(
                        task.getOrganizationId(), weekStart, "PRIMARY"
                ).map(OnCallSchedule::getUserId).orElse(null);
            case "MANUAL":
            default:
                return null;
        }
    }

    public UUID getLeastBusyUser(UUID teamId, List<TaskSkillRequirement> skillRequirements) {
        List<TeamMember> members = teamMemberRepository.findByTeamId(teamId);
        if (members.isEmpty()) return null;

        UUID bestUser = null;
        long minActiveTasks = Long.MAX_VALUE;

        for (TeamMember member : members) {
            UUID userId = member.getUserId();
            
            // Skill check if required
            if (skillRequirements != null && !skillRequirements.isEmpty()) {
                if (!userMeetsSkillRequirements(userId, skillRequirements)) {
                    continue;
                }
            }

            // Count active tasks assigned to this user
            long count = taskAssignmentRepository.findAll().stream()
                    .filter(a -> userId.equals(a.getUserId()))
                    .map(a -> taskRepository.findById(a.getTaskId()).orElse(null))
                    .filter(t -> t != null && t.getDeletedAt() == null)
                    // filter out completed tasks
                    .filter(t -> {
                        // For simplicity, count all tasks assigned to the user
                        return true;
                    })
                    .count();

            if (count < minActiveTasks) {
                minActiveTasks = count;
                bestUser = userId;
            }
        }

        return bestUser;
    }

    public UUID getRoundRobinUser(UUID teamId) {
        List<TeamMember> members = teamMemberRepository.findByTeamId(teamId);
        if (members.isEmpty()) return null;

        // Sort members by ID to make it deterministic
        members.sort(Comparator.comparing(m -> m.getUserId().toString()));

        // Find assignment history to see who was assigned last
        List<AssignmentHistory> history = assignmentHistoryRepository.findAll().stream()
                .filter(h -> "AUTO_ROUTING".equals(h.getAssignmentReason()))
                .sorted(Comparator.comparing(AssignmentHistory::getAssignedAt).reversed())
                .collect(Collectors.toList());

        if (history.isEmpty()) {
            return members.get(0).getUserId();
        }

        // Find the index of the last assigned user
        UUID lastAssignedUserId = history.get(0).getAssignedTo();
        int lastIndex = -1;
        for (int i = 0; i < members.size(); i++) {
            if (members.get(i).getUserId().equals(lastAssignedUserId)) {
                lastIndex = i;
                break;
            }
        }

        // Get the next user in rotation
        int nextIndex = (lastIndex + 1) % members.size();
        return members.get(nextIndex).getUserId();
    }

    public UUID getSkillMatchUser(UUID teamId, List<TaskSkillRequirement> requiredSkills) {
        if (requiredSkills == null || requiredSkills.isEmpty()) {
            return getLeastBusyUser(teamId, null);
        }

        List<TeamMember> members = teamMemberRepository.findByTeamId(teamId);
        List<UUID> qualifiedUsers = new ArrayList<>();

        for (TeamMember member : members) {
            if (userMeetsSkillRequirements(member.getUserId(), requiredSkills)) {
                qualifiedUsers.add(member.getUserId());
            }
        }

        if (qualifiedUsers.isEmpty()) {
            // Fallback to least busy user regardless of skills if no one matches
            return getLeastBusyUser(teamId, null);
        }

        // Return least busy among qualified users
        UUID bestUser = null;
        long minActiveTasks = Long.MAX_VALUE;
        for (UUID userId : qualifiedUsers) {
            long count = taskAssignmentRepository.findAll().stream()
                    .filter(a -> userId.equals(a.getUserId()))
                    .count();
            if (count < minActiveTasks) {
                minActiveTasks = count;
                bestUser = userId;
            }
        }

        return bestUser;
    }

    private boolean userMeetsSkillRequirements(UUID userId, List<TaskSkillRequirement> requirements) {
        List<UserSkill> userSkills = userSkillRepository.findByUserId(userId);
        for (TaskSkillRequirement req : requirements) {
            boolean hasSkill = userSkills.stream()
                    .anyMatch(us -> us.getSkillId().equals(req.getSkillId()) && us.getProficiencyLevel() >= req.getRequiredLevel());
            if (!hasSkill) {
                return false;
            }
        }
        return true;
    }

    @SuppressWarnings("unchecked")
    public void autoCreateSubtasks(Task parentTask, Map<String, Object> template) {
        List<Map<String, Object>> subtaskDefs = (List<Map<String, Object>>) template.get("subtasks");
        if (subtaskDefs == null) return;

        for (Map<String, Object> def : subtaskDefs) {
            String title = (String) def.get("title");
            String description = (String) def.get("description");
            String priority = (String) def.get("priority");

            Task subtask = Task.builder()
                    .id(UUID.randomUUID())
                    .projectId(parentTask.getProjectId())
                    .statusId(parentTask.getStatusId())
                    .currentStatusId(parentTask.getCurrentStatusId())
                    .title(title != null ? title : "Subtask")
                    .description(description)
                    .priority(priority != null ? priority : parentTask.getPriority())
                    .parentTaskId(parentTask.getId())
                    .organizationId(parentTask.getOrganizationId())
                    .createdBy(parentTask.getCreatedBy())
                    .taskType("TASK")
                    .build();

            taskRepository.save(subtask);
            log.info("Auto-created subtask {} under parent task {}", subtask.getId(), parentTask.getId());
        }
    }
}
