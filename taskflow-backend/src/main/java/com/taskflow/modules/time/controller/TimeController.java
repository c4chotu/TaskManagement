package com.taskflow.modules.time.controller;

import com.taskflow.modules.time.domain.TimeEntry;
import com.taskflow.modules.time.domain.Timesheet;
import com.taskflow.modules.time.service.TimeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class TimeController {

    private final TimeService timeService;

    public TimeController(TimeService timeService) {
        this.timeService = timeService;
    }

    @PostMapping("/time-entries/start")
    public ResponseEntity<TimeEntry> startTimer(@RequestBody Map<String, String> body) {
        UUID taskId = UUID.fromString(body.get("taskId"));
        return ResponseEntity.ok(timeService.startTimer(taskId));
    }

    @PostMapping("/time-entries/{id}/stop")
    public ResponseEntity<TimeEntry> stopTimer(@PathVariable UUID id) {
        return ResponseEntity.ok(timeService.stopTimer(id));
    }

    @PostMapping("/time-entries")
    public ResponseEntity<TimeEntry> createManualEntry(@RequestBody Map<String, Object> body) {
        UUID taskId = UUID.fromString((String) body.get("taskId"));
        Instant startTime = Instant.parse((String) body.get("startTime"));
        Instant endTime = body.get("endTime") != null ? Instant.parse((String) body.get("endTime")) : null;
        String description = (String) body.get("description");
        boolean billable = body.get("billable") != null && (Boolean) body.get("billable");
        return ResponseEntity.ok(timeService.createManualEntry(taskId, startTime, endTime, description, billable));
    }

    @PatchMapping("/time-entries/{id}")
    public ResponseEntity<TimeEntry> updateEntry(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        Instant startTime = Instant.parse((String) body.get("startTime"));
        Instant endTime = body.get("endTime") != null ? Instant.parse((String) body.get("endTime")) : null;
        String description = (String) body.get("description");
        boolean billable = body.get("billable") != null && (Boolean) body.get("billable");
        return ResponseEntity.ok(timeService.updateEntry(id, startTime, endTime, description, billable));
    }

    @DeleteMapping("/time-entries/{id}")
    public ResponseEntity<Void> deleteEntry(@PathVariable UUID id) {
        timeService.deleteEntry(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/time-entries")
    public ResponseEntity<List<TimeEntry>> listEntries(
            @RequestParam String from, @RequestParam String to) {
        return ResponseEntity.ok(timeService.listEntries(Instant.parse(from), Instant.parse(to)));
    }

    @PostMapping("/timesheets/{id}/submit")
    public ResponseEntity<Timesheet> submitTimesheet(@PathVariable UUID id) {
        return ResponseEntity.ok(timeService.submitTimesheet(id));
    }

    @PostMapping("/timesheets/{id}/approve")
    public ResponseEntity<Timesheet> approveTimesheet(@PathVariable UUID id) {
        return ResponseEntity.ok(timeService.approveTimesheet(id));
    }

    @GetMapping("/timesheets/current")
    public ResponseEntity<Timesheet> getCurrentTimesheet(@RequestParam(required = false) String date) {
        UUID userId = com.taskflow.common.security.SecurityContextHelper.getCurrentUserId();
        LocalDate targetDate = date != null ? LocalDate.parse(date) : LocalDate.now();
        return ResponseEntity.ok(timeService.getOrCreateTimesheetForWeek(userId, targetDate));
    }
}
