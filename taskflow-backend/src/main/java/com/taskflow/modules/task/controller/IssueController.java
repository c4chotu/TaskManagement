package com.taskflow.modules.task.controller;

import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.task.domain.IssueDetail;
import com.taskflow.modules.task.domain.OnCallSchedule;
import com.taskflow.modules.task.domain.SlaDefinition;
import com.taskflow.modules.task.dto.TaskRequest;
import com.taskflow.modules.task.repository.IssueDetailRepository;
import com.taskflow.modules.task.repository.OnCallScheduleRepository;
import com.taskflow.modules.task.repository.SlaDefinitionRepository;
import com.taskflow.modules.task.service.IssueService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
public class IssueController {

    private final IssueService issueService;
    private final IssueDetailRepository issueDetailRepository;
    private final SlaDefinitionRepository slaDefinitionRepository;
    private final OnCallScheduleRepository onCallScheduleRepository;

    public IssueController(IssueService issueService,
                           IssueDetailRepository issueDetailRepository,
                           SlaDefinitionRepository slaDefinitionRepository,
                           OnCallScheduleRepository onCallScheduleRepository) {
        this.issueService = issueService;
        this.issueDetailRepository = issueDetailRepository;
        this.slaDefinitionRepository = slaDefinitionRepository;
        this.onCallScheduleRepository = onCallScheduleRepository;
    }

    @PostMapping("/issues")
    public ResponseEntity<IssueDetail> createIssue(@RequestBody CreateIssueRequest request) {
        IssueDetail detail = issueService.createIssue(
                request.getTaskRequest(),
                request.getSeverity(),
                request.getEnvironment(),
                request.getAffectedVersion(),
                request.isCustomerReported(),
                request.getCustomerName(),
                request.getCustomerImpact()
        );
        return ResponseEntity.ok(detail);
    }

    @GetMapping("/issues/severity/{severity}")
    public ResponseEntity<List<IssueDetail>> listBySeverity(@PathVariable String severity) {
        List<IssueDetail> list = issueDetailRepository.findAll().stream()
                .filter(d -> severity.equalsIgnoreCase(d.getSeverity()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PostMapping("/issues/{id}/severity")
    public ResponseEntity<IssueDetail> updateSeverity(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        String severity = body.get("severity");
        if (severity == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(issueService.updateSeverity(id, severity));
    }

    @PostMapping("/issues/{id}/respond")
    public ResponseEntity<Void> respondToIssue(@PathVariable UUID id) {
        issueService.respondToIssue(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/issues/{id}/resolve")
    public ResponseEntity<Void> resolveIssue(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        String rootCause = body.get("rootCause");
        String resolution = body.get("resolution");
        issueService.resolveIssue(id, rootCause, resolution);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/issues/{id}/verify")
    public ResponseEntity<Void> verifyIssue(@PathVariable UUID id) {
        UUID verifierId = SecurityContextHelper.getCurrentUserId();
        if (verifierId == null) {
            return ResponseEntity.status(401).build();
        }
        issueService.verifyIssue(id, verifierId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/issues/{id}/duplicate/{parentId}")
    public ResponseEntity<Void> markDuplicate(@PathVariable UUID id, @PathVariable UUID parentId) {
        issueService.markDuplicate(id, parentId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/issues/{id}/sla-status")
    public ResponseEntity<Map<String, Object>> getSlaStatus(@PathVariable UUID id) {
        long minutesLeft = issueService.getSLAStatus(id);
        Map<String, Object> status = new HashMap<>();
        status.put("minutesRemaining", minutesLeft);
        status.put("breached", minutesLeft <= 0);
        return ResponseEntity.ok(status);
    }

    @PostMapping("/sla/definitions")
    public ResponseEntity<SlaDefinition> configureSla(@RequestBody SlaConfigRequest request) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            return ResponseEntity.status(401).build();
        }

        Optional<SlaDefinition> existing = slaDefinitionRepository.findByOrganizationIdAndSeverity(orgId, request.getSeverity());
        SlaDefinition def;
        if (existing.isPresent()) {
            def = existing.get();
            def.setResponseTimeMinutes(request.getResponseTimeMinutes());
            def.setFixTimeMinutes(request.getFixTimeMinutes());
            def.setEscalateAfterMinutes(request.getEscalateAfterMinutes());
            def.setEscalateToRole(request.getEscalateToRole());
            def.setBusinessHoursOnly(request.isBusinessHoursOnly());
        } else {
            def = SlaDefinition.builder()
                    .id(UUID.randomUUID())
                    .organizationId(orgId)
                    .severity(request.getSeverity())
                    .responseTimeMinutes(request.getResponseTimeMinutes())
                    .fixTimeMinutes(request.getFixTimeMinutes())
                    .escalateAfterMinutes(request.getEscalateAfterMinutes())
                    .escalateToRole(request.getEscalateToRole())
                    .businessHoursOnly(request.isBusinessHoursOnly())
                    .build();
        }

        return ResponseEntity.ok(slaDefinitionRepository.save(def));
    }

    @PostMapping("/on-call/schedule")
    public ResponseEntity<OnCallSchedule> setOnCallSchedule(@RequestBody OnCallScheduleRequest request) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            return ResponseEntity.status(401).build();
        }

        LocalDate start = LocalDate.parse(request.getWeekStartDate());

        Optional<OnCallSchedule> existing = onCallScheduleRepository
                .findByOrganizationIdAndWeekStartDateAndCoverageType(orgId, start, request.getCoverageType());
        OnCallSchedule sched;
        if (existing.isPresent()) {
            sched = existing.get();
            sched.setUserId(request.getUserId());
        } else {
            sched = OnCallSchedule.builder()
                    .id(UUID.randomUUID())
                    .organizationId(orgId)
                    .userId(request.getUserId())
                    .weekStartDate(start)
                    .coverageType(request.getCoverageType())
                    .build();
        }

        return ResponseEntity.ok(onCallScheduleRepository.save(sched));
    }

    @Data
    public static class CreateIssueRequest {
        private TaskRequest taskRequest;
        private String severity;
        private String environment;
        private String affectedVersion;
        private boolean customerReported;
        private String customerName;
        private String customerImpact;
    }

    @Data
    public static class SlaConfigRequest {
        private String severity;
        private int responseTimeMinutes;
        private int fixTimeMinutes;
        private Integer escalateAfterMinutes;
        private String escalateToRole;
        private boolean businessHoursOnly;
    }

    @Data
    public static class OnCallScheduleRequest {
        private UUID userId;
        private String weekStartDate; // YYYY-MM-DD
        private String coverageType; // PRIMARY, SECONDARY, TERTIARY
    }
}
