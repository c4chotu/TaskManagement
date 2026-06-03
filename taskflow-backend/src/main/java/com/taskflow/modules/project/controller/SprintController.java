package com.taskflow.modules.project.controller;

import com.taskflow.modules.project.domain.Sprint;
import com.taskflow.modules.project.service.SprintService;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/sprints")
public class SprintController {

    private final SprintService sprintService;

    public SprintController(SprintService sprintService) {
        this.sprintService = sprintService;
    }

    @GetMapping
    public ResponseEntity<List<SprintResponse>> listSprints(@RequestParam(required = false) UUID projectId) {
        List<Sprint> sprints;
        if (projectId != null) {
            sprints = sprintService.listSprintsByProject(projectId);
        } else {
            // Return all sprints if projectId is not provided
            sprints = new ArrayList<>(); // Or fetch all from repository if needed, but project-specific is the main flow.
        }
        
        List<SprintResponse> responses = sprints.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @PostMapping
    public ResponseEntity<SprintResponse> createSprint(@RequestBody SprintRequest request) {
        Instant start = request.getStartDate() != null ? Instant.parse(request.getStartDate()) : Instant.now();
        Instant end = request.getEndDate() != null ? Instant.parse(request.getEndDate()) : Instant.now().plus(java.time.Duration.ofDays(14));
        
        Sprint sprint = sprintService.createSprint(
                request.getProjectId(),
                request.getName(),
                request.getGoal(),
                start,
                end,
                request.getEstimatedHours(),
                request.getStatus()
        );
        return ResponseEntity.ok(mapToResponse(sprint));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SprintResponse> getSprint(@PathVariable UUID id) {
        Sprint sprint = sprintService.getSprint(id);
        return ResponseEntity.ok(mapToResponse(sprint));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SprintResponse> updateSprint(@PathVariable UUID id, @RequestBody SprintRequest request) {
        Instant start = request.getStartDate() != null ? Instant.parse(request.getStartDate()) : null;
        Instant end = request.getEndDate() != null ? Instant.parse(request.getEndDate()) : null;

        Sprint sprint = sprintService.updateSprint(
                id,
                request.getName(),
                request.getGoal(),
                start,
                end,
                request.getEstimatedHours(),
                request.getStatus()
        );
        return ResponseEntity.ok(mapToResponse(sprint));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSprint(@PathVariable UUID id) {
        sprintService.deleteSprint(id);
        return ResponseEntity.noContent().build();
    }

    private SprintResponse mapToResponse(Sprint sprint) {
        List<UUID> taskIds = sprintService.getTaskIdsForSprint(sprint.getId());
        return SprintResponse.builder()
                .id(sprint.getId())
                .projectId(sprint.getProjectId())
                .name(sprint.getName())
                .goal(sprint.getGoal())
                .startDate(sprint.getStartDate())
                .endDate(sprint.getEndDate())
                .status(sprint.getStatus())
                .estimatedHours(sprint.getEstimatedHours())
                .taskIds(taskIds)
                .build();
    }

    @Data
    public static class SprintRequest {
        private UUID projectId;
        private String name;
        private String goal;
        private String startDate;
        private String endDate;
        private String status;
        private Double estimatedHours;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SprintResponse {
        private UUID id;
        private UUID projectId;
        private String name;
        private String goal;
        private Instant startDate;
        private Instant endDate;
        private String status;
        private Double estimatedHours;
        private List<UUID> taskIds;
    }
}
