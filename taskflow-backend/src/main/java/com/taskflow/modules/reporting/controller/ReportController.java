package com.taskflow.modules.reporting.controller;

import com.taskflow.modules.reporting.service.ReportService;
import com.taskflow.modules.reporting.service.ReportAsyncService;
import com.taskflow.modules.reporting.service.WidgetReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {

    private final ReportService reportService;
    private final ReportAsyncService reportAsyncService;
    private final com.taskflow.modules.reporting.repository.ReportJobRepository reportJobRepository;
    private final WidgetReportService widgetReportService;

    public ReportController(ReportService reportService,
                            ReportAsyncService reportAsyncService,
                            com.taskflow.modules.reporting.repository.ReportJobRepository reportJobRepository,
                            WidgetReportService widgetReportService) {
        this.reportService = reportService;
        this.reportAsyncService = reportAsyncService;
        this.reportJobRepository = reportJobRepository;
        this.widgetReportService = widgetReportService;
    }

    @GetMapping("/projects/{projectId}/completion")
    public ResponseEntity<Map<String, Object>> projectCompletion(@PathVariable UUID projectId) {
        return ResponseEntity.ok(reportService.projectCompletionReport(projectId));
    }

    @GetMapping("/projects/{projectId}/workload")
    public ResponseEntity<Map<String, Object>> memberWorkload(@PathVariable UUID projectId) {
        return ResponseEntity.ok(reportService.memberWorkloadReport(projectId));
    }

    @GetMapping("/projects/{projectId}/time-utilization")
    public ResponseEntity<Map<String, Object>> timeUtilization(
            @PathVariable UUID projectId,
            @RequestParam String from,
            @RequestParam String to) {
        return ResponseEntity.ok(reportService.timeUtilizationReport(
                projectId, LocalDate.parse(from), LocalDate.parse(to)));
    }

    @PostMapping("/export-async")
    public ResponseEntity<Map<String, String>> exportAsync(@RequestBody Map<String, Object> payload) {
        UUID orgId = com.taskflow.common.security.SecurityContextHelper.getCurrentOrgId();
        UUID userId = com.taskflow.common.security.SecurityContextHelper.getCurrentUserId();

        UUID jobId = UUID.randomUUID();
        com.taskflow.modules.reporting.domain.ReportJob job = com.taskflow.modules.reporting.domain.ReportJob.builder()
                .id(jobId)
                .organizationId(orgId)
                .requestedBy(userId)
                .status("PENDING")
                .build();
        reportJobRepository.save(job);

        String projectIdStr = (String) payload.get("projectId");
        UUID projectId = projectIdStr != null ? UUID.fromString(projectIdStr) : null;
        String filterType = (String) payload.get("filterType");
        List<String> columns = (List<String>) payload.get("columns");

        reportAsyncService.generateReportAsync(jobId, orgId, projectId, filterType, columns);

        return ResponseEntity.ok(Map.of("jobId", jobId.toString()));
    }

    @GetMapping("/export-async/{id}")
    public ResponseEntity<Map<String, String>> checkExportStatus(@PathVariable UUID id) {
        com.taskflow.modules.reporting.domain.ReportJob job = reportJobRepository.findById(id).orElse(null);
        if (job == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("status", job.getStatus()));
    }

    @GetMapping("/export-async/{id}/download")
    public ResponseEntity<org.springframework.core.io.Resource> downloadExport(@PathVariable UUID id) throws java.io.IOException {
        com.taskflow.modules.reporting.domain.ReportJob job = reportJobRepository.findById(id).orElse(null);
        if (job == null || !"COMPLETED".equals(job.getStatus()) || job.getFilePath() == null) {
            return ResponseEntity.notFound().build();
        }

        java.nio.file.Path path = java.nio.file.Paths.get(job.getFilePath());
        org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(path.toUri());

        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    @GetMapping("/dashboard/widgets")
    public ResponseEntity<Map<String, Object>> getDashboardWidgets() {
        return ResponseEntity.ok(reportService.getDashboardWidgetsData());
    }

    @GetMapping("/team/{teamId}/tasks")
    public ResponseEntity<List<Map<String, Object>>> getTeamTasks(@PathVariable UUID teamId) {
        return ResponseEntity.ok(reportService.getTeamTasks(teamId));
    }

    // ── Widget Gallery Endpoints ─────────────────────────────────────────

    /** Master endpoint — returns all widget data in one call */
    @GetMapping("/widgets/all")
    public ResponseEntity<Map<String, Object>> getAllWidgetData() {
        return ResponseEntity.ok(widgetReportService.getAllWidgetData());
    }

    // Projects
    @GetMapping("/widgets/projects/by-owners")
    public ResponseEntity<List<Map<String, Object>>> projectsByOwners() {
        return ResponseEntity.ok(widgetReportService.projectsByOwners());
    }
    @GetMapping("/widgets/projects/by-group")
    public ResponseEntity<List<Map<String, Object>>> projectsByGroup() {
        return ResponseEntity.ok(widgetReportService.projectsByGroup());
    }
    @GetMapping("/widgets/projects/by-customers")
    public ResponseEntity<List<Map<String, Object>>> projectsByCustomers() {
        return ResponseEntity.ok(widgetReportService.projectsByCustomers());
    }
    @GetMapping("/widgets/projects/status")
    public ResponseEntity<List<Map<String, Object>>> projectStatusDistribution() {
        return ResponseEntity.ok(widgetReportService.projectStatusDistribution());
    }

    // Tasks
    @GetMapping("/widgets/tasks/status")
    public ResponseEntity<List<Map<String, Object>>> taskStatusReport() {
        return ResponseEntity.ok(widgetReportService.taskStatusReport());
    }
    @GetMapping("/widgets/tasks/by-owner")
    public ResponseEntity<List<Map<String, Object>>> taskOwnerReport() {
        return ResponseEntity.ok(widgetReportService.taskOwnerReport());
    }
    @GetMapping("/widgets/tasks/by-priority")
    public ResponseEntity<List<Map<String, Object>>> taskPriorityReport() {
        return ResponseEntity.ok(widgetReportService.taskPriorityReport());
    }
    @GetMapping("/widgets/tasks/by-milestone")
    public ResponseEntity<List<Map<String, Object>>> taskByMilestone() {
        return ResponseEntity.ok(widgetReportService.taskByMilestone());
    }
    @GetMapping("/widgets/tasks/completion")
    public ResponseEntity<List<Map<String, Object>>> taskCompletionReport() {
        return ResponseEntity.ok(widgetReportService.taskCompletionReport());
    }
    @GetMapping("/widgets/tasks/created-vs-completed")
    public ResponseEntity<List<Map<String, Object>>> createdVsCompleted() {
        return ResponseEntity.ok(widgetReportService.createdVsCompleted());
    }
    @GetMapping("/widgets/tasks/avg-completion-time")
    public ResponseEntity<List<Map<String, Object>>> avgTaskCompletionTime() {
        return ResponseEntity.ok(widgetReportService.avgTaskCompletionTime());
    }

    // Issues
    @GetMapping("/widgets/issues/by-severity")
    public ResponseEntity<List<Map<String, Object>>> issueSeverityReport() {
        return ResponseEntity.ok(widgetReportService.issueSeverityReport());
    }
    @GetMapping("/widgets/issues/by-assignee")
    public ResponseEntity<List<Map<String, Object>>> issueAssigneeReport() {
        return ResponseEntity.ok(widgetReportService.issueAssigneeReport());
    }
    @GetMapping("/widgets/issues/status")
    public ResponseEntity<List<Map<String, Object>>> issueStatusReport() {
        return ResponseEntity.ok(widgetReportService.issueStatusReport());
    }
    @GetMapping("/widgets/issues/by-module")
    public ResponseEntity<List<Map<String, Object>>> issueModuleReport() {
        return ResponseEntity.ok(widgetReportService.issueModuleReport());
    }
    @GetMapping("/widgets/issues/by-milestone")
    public ResponseEntity<List<Map<String, Object>>> issueCountByMilestone() {
        return ResponseEntity.ok(widgetReportService.issueCountByMilestone());
    }
    @GetMapping("/widgets/issues/avg-completion-time")
    public ResponseEntity<List<Map<String, Object>>> avgIssueCompletionTime() {
        return ResponseEntity.ok(widgetReportService.avgIssueCompletionTime());
    }
    @GetMapping("/widgets/issues/created-vs-completed")
    public ResponseEntity<List<Map<String, Object>>> issueCreatedVsCompleted() {
        return ResponseEntity.ok(widgetReportService.issueCreatedVsCompleted());
    }

    // Phases
    @GetMapping("/widgets/phases/status")
    public ResponseEntity<List<Map<String, Object>>> phaseStatusReport() {
        return ResponseEntity.ok(widgetReportService.phaseStatusReport());
    }
    @GetMapping("/widgets/phases/completion-time")
    public ResponseEntity<List<Map<String, Object>>> phaseCompletionTimeReport() {
        return ResponseEntity.ok(widgetReportService.phaseCompletionTimeReport());
    }

    // Time Logs
    @GetMapping("/widgets/timelogs/by-user")
    public ResponseEntity<List<Map<String, Object>>> timeLoggedByUser() {
        return ResponseEntity.ok(widgetReportService.timeLoggedByUser());
    }
    @GetMapping("/widgets/timelogs/by-project")
    public ResponseEntity<List<Map<String, Object>>> timeLoggedByProject() {
        return ResponseEntity.ok(widgetReportService.timeLoggedByProject());
    }
    @GetMapping("/widgets/timelogs/billable")
    public ResponseEntity<List<Map<String, Object>>> billableVsNonBillable() {
        return ResponseEntity.ok(widgetReportService.billableVsNonBillable());
    }
}
