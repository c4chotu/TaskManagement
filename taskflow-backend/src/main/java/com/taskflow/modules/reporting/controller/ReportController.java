package com.taskflow.modules.reporting.controller;

import com.taskflow.modules.reporting.service.ReportService;
import com.taskflow.modules.reporting.service.ReportAsyncService;
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

    public ReportController(ReportService reportService, 
                            ReportAsyncService reportAsyncService,
                            com.taskflow.modules.reporting.repository.ReportJobRepository reportJobRepository) {
        this.reportService = reportService;
        this.reportAsyncService = reportAsyncService;
        this.reportJobRepository = reportJobRepository;
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
}
