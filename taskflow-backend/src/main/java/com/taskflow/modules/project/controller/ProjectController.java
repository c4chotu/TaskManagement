package com.taskflow.modules.project.controller;

import com.taskflow.modules.project.domain.Project;
import com.taskflow.modules.project.domain.ProjectMember;
import com.taskflow.modules.project.service.ProjectService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping
    public ResponseEntity<Project> createProject(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String description = (String) body.get("description");
        String type = (String) body.get("type");
        String startDateStr = (String) body.get("startDate");
        String endDateStr = (String) body.get("endDate");

        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Project name is required");
        }

        Instant startDate = startDateStr != null ? Instant.parse(startDateStr) : null;
        Instant endDate = endDateStr != null ? Instant.parse(endDateStr) : null;

        return ResponseEntity.ok(projectService.createProject(name, description, type, startDate, endDate));
    }

    @GetMapping
    public ResponseEntity<List<Project>> listProjects() {
        return ResponseEntity.ok(projectService.listProjects());
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<Project> getProject(@PathVariable UUID projectId) {
        return ResponseEntity.ok(projectService.getProject(projectId));
    }

    @PatchMapping("/{projectId}")
    public ResponseEntity<Project> updateProject(
            @PathVariable UUID projectId,
            @RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String description = (String) body.get("description");
        String status = (String) body.get("status");
        String type = (String) body.get("type");
        String startDateStr = (String) body.get("startDate");
        String endDateStr = (String) body.get("endDate");

        Instant startDate = startDateStr != null ? Instant.parse(startDateStr) : null;
        Instant endDate = endDateStr != null ? Instant.parse(endDateStr) : null;

        return ResponseEntity.ok(projectService.updateProject(projectId, name, description, status, type, startDate, endDate));
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(@PathVariable UUID projectId) {
        projectService.deleteProject(projectId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{projectId}/members")
    public ResponseEntity<ProjectMember> addMember(
            @PathVariable UUID projectId,
            @RequestBody Map<String, Object> body) {
        String userIdStr = (String) body.get("userId");
        String role = (String) body.get("role");

        if (userIdStr == null) {
            throw new IllegalArgumentException("userId is required");
        }

        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(projectService.addMember(projectId, userId, role));
    }

    @DeleteMapping("/{projectId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable UUID projectId,
            @PathVariable UUID userId) {
        projectService.removeMember(projectId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{projectId}/members")
    public ResponseEntity<List<ProjectMember>> listMembers(@PathVariable UUID projectId) {
        return ResponseEntity.ok(projectService.listMembers(projectId));
    }
}
