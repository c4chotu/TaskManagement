package com.taskflow.modules.time.controller;

import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.task.domain.Task;
import com.taskflow.modules.task.repository.TaskRepository;
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
    private final TaskRepository taskRepository;

    public TimeController(TimeService timeService, TaskRepository taskRepository) {
        this.timeService = timeService;
        this.taskRepository = taskRepository;
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
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        Instant fromInstant = from != null ? Instant.parse(from) : Instant.now().minus(30, java.time.temporal.ChronoUnit.DAYS);
        Instant toInstant = to != null ? Instant.parse(to) : Instant.now();
        return ResponseEntity.ok(timeService.listEntries(fromInstant, toInstant));
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
        UUID userId = SecurityContextHelper.getCurrentUserId();
        LocalDate targetDate = date != null ? LocalDate.parse(date) : LocalDate.now();
        return ResponseEntity.ok(timeService.getOrCreateTimesheetForWeek(userId, targetDate));
    }

    /**
     * GET /api/v1/time/assigned-tasks
     * Returns tasks assigned to the current user — used by the timesheet calendar.
     */
    @GetMapping("/time/assigned-tasks")
    public ResponseEntity<List<Task>> getAssignedTasksForTimesheet() {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        return ResponseEntity.ok(taskRepository.findAssignedToUser(userId, orgId));
    }

    /**
     * POST /api/v1/time-entries/bulk-log
     * Body: [{ taskId, date (yyyy-MM-dd), hours, description }]
     * Logs multiple time entries for a calendar-day in one request.
     */
    @PostMapping("/time-entries/bulk-log")
    public ResponseEntity<List<TimeEntry>> bulkLogTime(
            @RequestBody List<Map<String, Object>> entries) {
        List<TimeEntry> saved = entries.stream().map(e -> {
            UUID taskId = UUID.fromString((String) e.get("taskId"));
            String date = (String) e.get("date"); // yyyy-MM-dd
            double hours = ((Number) e.get("hours")).doubleValue();
            String description = (String) e.getOrDefault("description", "");
            boolean billable = e.containsKey("billable") && (Boolean) e.get("billable");
            // Convert date + hours into start/end instants (midnight UTC for that date)
            Instant start = Instant.parse(date + "T00:00:00Z");
            Instant end = Instant.parse(date + "T00:00:00Z").plusSeconds((long)(hours * 3600));
            return timeService.createManualEntry(taskId, start, end, description, billable);
        }).toList();
        return ResponseEntity.ok(saved);
    }
}

