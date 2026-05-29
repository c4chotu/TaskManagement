package com.taskflow.modules.reporting.controller;

import com.taskflow.modules.reporting.service.ReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
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
}
