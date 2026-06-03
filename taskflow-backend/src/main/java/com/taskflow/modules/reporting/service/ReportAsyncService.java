package com.taskflow.modules.reporting.service;

import com.taskflow.modules.reporting.domain.ReportJob;
import com.taskflow.modules.reporting.repository.ReportJobRepository;
import com.taskflow.modules.task.domain.Task;
import com.taskflow.modules.task.domain.CustomTaskStatus;
import com.taskflow.modules.task.repository.TaskRepository;
import com.taskflow.modules.task.repository.CustomTaskStatusRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ReportAsyncService {

    private final ReportJobRepository reportJobRepository;
    private final TaskRepository taskRepository;
    private final CustomTaskStatusRepository customTaskStatusRepository;

    public ReportAsyncService(ReportJobRepository reportJobRepository,
                              TaskRepository taskRepository,
                              CustomTaskStatusRepository customTaskStatusRepository) {
        this.reportJobRepository = reportJobRepository;
        this.taskRepository = taskRepository;
        this.customTaskStatusRepository = customTaskStatusRepository;
    }

    @Async
    public void generateReportAsync(UUID jobId, UUID orgId, UUID projectId, String filterType, List<String> columns) {
        try {
            // Simulate processing time
            Thread.sleep(1000);

            Path tempDir = Paths.get(System.getProperty("java.io.tmpdir"), "taskflow_reports");
            if (!Files.exists(tempDir)) {
                Files.createDirectories(tempDir);
            }

            Path file = tempDir.resolve("report_" + jobId + ".csv");

            // Query Tasks
            List<Task> tasks;
            if (projectId != null) {
                tasks = taskRepository.findByProjectIdAndDeletedAtIsNull(projectId);
            } else {
                tasks = taskRepository.findByOrganizationIdAndDeletedAtIsNull(orgId);
            }

            // Fetch Custom Task Statuses for name mapping
            List<CustomTaskStatus> statuses = customTaskStatusRepository.findAll();
            Map<UUID, String> statusNames = new HashMap<>();
            for (CustomTaskStatus s : statuses) {
                statusNames.put(s.getId(), s.getName());
            }

            // Write CSV
            try (FileWriter writer = new FileWriter(file.toFile())) {
                // Header
                writer.append(String.join(",", columns)).append("\n");

                // Rows
                for (Task task : tasks) {
                    List<String> rowValues = new ArrayList<>();
                    for (String col : columns) {
                        rowValues.add(getTaskFieldValue(task, col, statusNames));
                    }
                    writer.append(String.join(",", rowValues)).append("\n");
                }
            }

            ReportJob job = reportJobRepository.findById(jobId).orElse(null);
            if (job != null) {
                job.setStatus("COMPLETED");
                job.setFilePath(file.toString());
                reportJobRepository.save(job);
            }
        } catch (Exception e) {
            ReportJob job = reportJobRepository.findById(jobId).orElse(null);
            if (job != null) {
                job.setStatus("FAILED");
                reportJobRepository.save(job);
            }
        }
    }

    private String getTaskFieldValue(Task task, String column, Map<UUID, String> statusNames) {
        if (task == null || column == null) return "";
        
        return switch (column.trim().toLowerCase()) {
            case "id" -> task.getId() != null ? task.getId().toString() : "";
            case "tasknumber" -> task.getTaskNumber() != null ? task.getTaskNumber().toString() : "";
            case "displayid" -> task.getDisplayId() != null ? task.getDisplayId() : "";
            case "projectid" -> task.getProjectId() != null ? task.getProjectId().toString() : "";
            case "statusid" -> task.getStatusId() != null ? task.getStatusId().toString() : "";
            case "currentstatusid" -> task.getCurrentStatusId() != null ? task.getCurrentStatusId().toString() : "";
            case "status", "currentstatus" -> {
                if (task.getCurrentStatusId() != null && statusNames.containsKey(task.getCurrentStatusId())) {
                    yield statusNames.get(task.getCurrentStatusId());
                }
                yield "To Do";
            }
            case "tasktype", "type" -> task.getTaskType() != null ? task.getTaskType() : "TASK";
            case "departmentid" -> task.getDepartmentId() != null ? task.getDepartmentId().toString() : "";
            case "teamid" -> task.getTeamId() != null ? task.getTeamId().toString() : "";
            case "title" -> task.getTitle() != null ? escapeCsvValue(task.getTitle()) : "";
            case "description" -> task.getDescription() != null ? escapeCsvValue(task.getDescription()) : "";
            case "priority" -> task.getPriority() != null ? task.getPriority() : "MEDIUM";
            case "startdate" -> task.getStartDate() != null ? task.getStartDate().toString() : "";
            case "duedate" -> task.getDueDate() != null ? task.getDueDate().toString() : "";
            case "category" -> task.getCategory() != null ? task.getCategory() : "";
            case "badgeid" -> task.getBadgeId() != null ? task.getBadgeId().toString() : "";
            case "storypoints" -> task.getStoryPoints() != null ? task.getStoryPoints().toString() : "";
            case "parenttaskid" -> task.getParentTaskId() != null ? task.getParentTaskId().toString() : "";
            case "phaseid" -> task.getPhaseId() != null ? task.getPhaseId().toString() : "";
            case "sprintid" -> task.getSprintId() != null ? task.getSprintId().toString() : "";
            case "organizationid" -> task.getOrganizationId() != null ? task.getOrganizationId().toString() : "";
            case "createdby" -> task.getCreatedBy() != null ? task.getCreatedBy().toString() : "";
            case "createdat" -> task.getCreatedAt() != null ? task.getCreatedAt().toString() : "";
            default -> "";
        };
    }

    private String escapeCsvValue(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains("\"") || val.contains("\n") || val.contains("\r")) {
            return "\"" + val.replace("\"", "\"\"") + "\"";
        }
        return val;
    }
}
