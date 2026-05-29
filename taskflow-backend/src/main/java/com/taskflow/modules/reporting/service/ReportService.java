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

@Service
public class ReportService {

    private final TaskRepository taskRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final TimeEntryRepository timeEntryRepository;

    public ReportService(TaskRepository taskRepository,
                         TaskAssignmentRepository taskAssignmentRepository,
                         TimeEntryRepository timeEntryRepository) {
        this.taskRepository = taskRepository;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.timeEntryRepository = timeEntryRepository;
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
}
