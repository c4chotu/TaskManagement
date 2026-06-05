package com.taskflow.modules.reporting.service;

import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.task.repository.TaskRepository;
import com.taskflow.modules.task.repository.TaskAssignmentRepository;
import com.taskflow.modules.time.repository.TimeEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;

import com.taskflow.modules.project.domain.Project;
import com.taskflow.modules.project.domain.Sprint;
import com.taskflow.modules.project.repository.ProjectRepository;
import com.taskflow.modules.project.repository.SprintRepository;
import com.taskflow.modules.auth.domain.User;
import com.taskflow.modules.auth.repository.UserRepository;
import com.taskflow.modules.user.domain.Team;
import com.taskflow.modules.user.domain.TeamMember;
import com.taskflow.modules.user.repository.TeamRepository;
import com.taskflow.modules.user.repository.TeamMemberRepository;
import com.taskflow.modules.task.domain.Task;
import com.taskflow.modules.task.domain.IssueDetail;
import com.taskflow.modules.task.repository.IssueDetailRepository;
import com.taskflow.modules.task.domain.TaskAssignment;

@Service
public class ReportService {

    private final TaskRepository taskRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final TimeEntryRepository timeEntryRepository;
    private final ProjectRepository projectRepository;
    private final SprintRepository sprintRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final IssueDetailRepository issueDetailRepository;

    public ReportService(TaskRepository taskRepository,
                         TaskAssignmentRepository taskAssignmentRepository,
                         TimeEntryRepository timeEntryRepository,
                         ProjectRepository projectRepository,
                         SprintRepository sprintRepository,
                         UserRepository userRepository,
                         TeamRepository teamRepository,
                         TeamMemberRepository teamMemberRepository,
                         IssueDetailRepository issueDetailRepository) {
        this.taskRepository = taskRepository;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.timeEntryRepository = timeEntryRepository;
        this.projectRepository = projectRepository;
        this.sprintRepository = sprintRepository;
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.issueDetailRepository = issueDetailRepository;
    }

    /**
     * Project completion report: tasks by status.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> projectCompletionReport(UUID projectId) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();

        long total = taskRepository.countByProjectIdAndOrganizationId(projectId, orgId);
        long completed = taskRepository.countByProjectIdAndOrganizationIdAndIsDeleted(projectId, orgId, false);

        return Map.of(
                "projectId", projectId,
                "totalTasks", total,
                "completedTasks", completed,
                "completionRate", total > 0 ? (double) completed / total * 100 : 0
        );
    }

    /**
     * Member workload report: task count per assignee for a project.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> memberWorkloadReport(UUID projectId) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();

        List<Object[]> rows = taskAssignmentRepository.countTasksPerUserForProject(projectId);
        List<Map<String, Object>> workload = new ArrayList<>();
        for (Object[] row : rows) {
            workload.add(Map.of(
                    "userId", row[0],
                    "taskCount", row[1]
            ));
        }

        return Map.of(
                "projectId", projectId,
                "memberWorkload", workload
        );
    }

    /**
     * Time utilization report: total hours logged per user within a date range.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> timeUtilizationReport(UUID projectId, LocalDate from, LocalDate to) {
        Instant fromInstant = from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant toInstant = to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);

        // Aggregate time entries that belong to tasks in this project
        List<Object[]> rows = timeEntryRepository.sumMinutesPerUserForProject(projectId, fromInstant, toInstant);
        List<Map<String, Object>> utilization = new ArrayList<>();
        for (Object[] row : rows) {
            utilization.add(Map.of(
                    "userId", row[0],
                    "totalMinutes", row[1],
                    "totalHours", row[1] != null ? ((Number) row[1]).doubleValue() / 60.0 : 0
            ));
        }

        return Map.of(
                "projectId", projectId,
                "from", from.toString(),
                "to", to.toString(),
                "utilization", utilization
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardWidgetsData() {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();

        List<Project> projects = projectRepository.findByOrganizationId(orgId);
        List<Task> tasks = taskRepository.findByOrganizationIdAndDeletedAtIsNull(orgId);
        List<User> users = userRepository.findByOrganizationId(orgId);
        List<Team> teams = teamRepository.findByOrganizationId(orgId);
        List<TeamMember> teamMembers = teamMemberRepository.findAll();

        List<Sprint> sprints = new ArrayList<>();
        for (Project p : projects) {
            sprints.addAll(sprintRepository.findByProjectId(p.getId()));
        }

        Set<UUID> orgTaskIds = new HashSet<>();
        for (Task t : tasks) {
            orgTaskIds.add(t.getId());
        }
        List<IssueDetail> allIssues = issueDetailRepository.findAll();
        List<IssueDetail> orgIssues = new ArrayList<>();
        for (IssueDetail issue : allIssues) {
            if (orgTaskIds.contains(issue.getTaskId())) {
                orgIssues.add(issue);
            }
        }

        Map<String, Object> reports = new HashMap<>();

        Map<String, Long> projectsByStatus = new HashMap<>();
        Map<String, Long> projectsByType = new HashMap<>();
        Map<String, Long> projectsByGroup = new HashMap<>();
        Map<String, Long> projectsByCustomer = new HashMap<>();

        for (Project p : projects) {
            projectsByStatus.put(p.getStatus(), projectsByStatus.getOrDefault(p.getStatus(), 0L) + 1);
            String type = p.getType() != null ? p.getType() : "STANDARD";
            projectsByType.put(type, projectsByType.getOrDefault(type, 0L) + 1);
            String group = p.getProjectGroup() != null ? p.getProjectGroup() : "Engineering";
            projectsByGroup.put(group, projectsByGroup.getOrDefault(group, 0L) + 1);
            String customer = p.getCustomer() != null ? p.getCustomer() : "Internal";
            projectsByCustomer.put(customer, projectsByCustomer.getOrDefault(customer, 0L) + 1);
        }

        reports.put("projectsByStatus", projectsByStatus);
        reports.put("projectsByType", projectsByType);
        reports.put("projectsByGroup", projectsByGroup);
        reports.put("projectsByCustomer", projectsByCustomer);

        Map<String, Long> tasksByPriority = new HashMap<>();
        Map<String, Long> tasksByStatus = new HashMap<>();
        Map<String, Long> tasksByType = new HashMap<>();

        for (Task t : tasks) {
            tasksByPriority.put(t.getPriority(), tasksByPriority.getOrDefault(t.getPriority(), 0L) + 1);
            tasksByStatus.put(t.getStatusId() != null ? t.getStatusId().toString() : "UNKNOWN", tasksByStatus.getOrDefault(t.getStatusId() != null ? t.getStatusId().toString() : "UNKNOWN", 0L) + 1);
            tasksByType.put(t.getTaskType(), tasksByType.getOrDefault(t.getTaskType(), 0L) + 1);
        }

        reports.put("tasksByPriority", tasksByPriority);
        reports.put("tasksByStatus", tasksByStatus);
        reports.put("tasksByType", tasksByType);

        Map<String, Long> issuesBySeverity = new HashMap<>();
        Map<String, Long> issuesByEnvironment = new HashMap<>();
        for (IssueDetail issue : orgIssues) {
            issuesBySeverity.put(issue.getSeverity(), issuesBySeverity.getOrDefault(issue.getSeverity(), 0L) + 1);
            issuesByEnvironment.put(issue.getEnvironment(), issuesByEnvironment.getOrDefault(issue.getEnvironment(), 0L) + 1);
        }
        reports.put("issuesBySeverity", issuesBySeverity);
        reports.put("issuesByEnvironment", issuesByEnvironment);

        Map<String, Long> phasesByStatus = new HashMap<>();
        for (Sprint s : sprints) {
            phasesByStatus.put(s.getStatus(), phasesByStatus.getOrDefault(s.getStatus(), 0L) + 1);
        }
        reports.put("phasesByStatus", phasesByStatus);

        Map<String, Object> result = new HashMap<>();
        result.put("projects", projects);
        result.put("tasks", tasks);
        result.put("issues", orgIssues);
        result.put("sprints", sprints);
        result.put("users", users);
        result.put("teams", teams);
        result.put("teamMembers", teamMembers);
        result.put("reports", reports);

        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTeamTasks(UUID teamId) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        
        List<TeamMember> members = teamMemberRepository.findAll();
        Set<UUID> teamUserIds = new HashSet<>();
        for (TeamMember m : members) {
            if (m.getTeamId().equals(teamId)) {
                teamUserIds.add(m.getUserId());
            }
        }

        List<Task> orgTasks = taskRepository.findByOrganizationIdAndDeletedAtIsNull(orgId);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Task t : orgTasks) {
            List<TaskAssignment> assigns = taskAssignmentRepository.findByTaskId(t.getId());
            boolean isAssignedToTeam = false;
            List<UUID> assigneeIds = new ArrayList<>();
            for (TaskAssignment ta : assigns) {
                assigneeIds.add(ta.getUserId());
                if (teamUserIds.contains(ta.getUserId())) {
                    isAssignedToTeam = true;
                }
            }

            if (isAssignedToTeam) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", t.getId());
                map.put("title", t.getTitle());
                map.put("statusId", t.getStatusId());
                map.put("projectId", t.getProjectId());
                map.put("priority", t.getPriority());
                map.put("dueDate", t.getDueDate() != null ? t.getDueDate().toString() : null);
                map.put("assigneeIds", assigneeIds);
                map.put("taskType", t.getTaskType());
                result.add(map);
            }
        }
        return result;
    }
}
