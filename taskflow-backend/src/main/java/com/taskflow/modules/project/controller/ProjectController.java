package com.taskflow.modules.project.controller;

import com.taskflow.modules.project.domain.Project;
import com.taskflow.modules.project.domain.ProjectMember;
import com.taskflow.modules.project.domain.ProjectTeam;
import com.taskflow.modules.project.repository.ProjectTeamRepository;
import com.taskflow.modules.project.service.ProjectService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private final ProjectService projectService;
    private final com.taskflow.modules.file.service.FileService fileService;
    private final ProjectTeamRepository projectTeamRepository;

    public ProjectController(ProjectService projectService,
                             com.taskflow.modules.file.service.FileService fileService,
                             ProjectTeamRepository projectTeamRepository) {
        this.projectService = projectService;
        this.fileService = fileService;
        this.projectTeamRepository = projectTeamRepository;
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

    @PostMapping(value = "/{projectId}/attachments", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadAttachment(
            @PathVariable UUID projectId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        com.taskflow.modules.file.domain.FileAttachment att = fileService.uploadFile(file, "PROJECT", projectId);
        return ResponseEntity.ok(mapAttachment(att));
    }

    @GetMapping("/{projectId}/attachments")
    public ResponseEntity<List<Map<String, Object>>> getAttachments(@PathVariable UUID projectId) {
        List<com.taskflow.modules.file.domain.FileAttachment> list = fileService.listFiles("PROJECT", projectId);
        List<Map<String, Object>> response = list.stream()
                .map(this::mapAttachment)
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{projectId}/attachments/{attachmentId}")
    public ResponseEntity<Void> deleteAttachment(
            @PathVariable UUID projectId,
            @PathVariable UUID attachmentId) {
        fileService.deleteFile(attachmentId);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> mapAttachment(com.taskflow.modules.file.domain.FileAttachment att) {
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", att.getId().toString());
        map.put("projectId", att.getEntityId().toString());
        map.put("fileName", att.getOriginalFilename());
        map.put("mimeType", att.getContentType());
        map.put("sizeBytes", att.getFileSize());
        map.put("url", "/api/v1/files/" + att.getId() + "/download");
        map.put("uploadedAt", att.getCreatedAt().toString());
        return map;
    }

    // ── Project Teams ──────────────────────────────────────────────────

    @GetMapping("/{projectId}/teams")
    public ResponseEntity<List<ProjectTeam>> getProjectTeams(@PathVariable UUID projectId) {
        return ResponseEntity.ok(projectTeamRepository.findByProjectId(projectId));
    }

    @PostMapping("/{projectId}/teams")
    public ResponseEntity<ProjectTeam> addProjectTeam(
            @PathVariable UUID projectId,
            @RequestBody Map<String, String> body) {
        String teamIdStr = body.get("teamId");
        if (teamIdStr == null) {
            return ResponseEntity.badRequest().build();
        }
        UUID teamId = UUID.fromString(teamIdStr);

        Optional<ProjectTeam> existing = projectTeamRepository.findByProjectIdAndTeamId(projectId, teamId);
        if (existing.isPresent()) {
            return ResponseEntity.ok(existing.get());
        }

        ProjectTeam pt = ProjectTeam.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .teamId(teamId)
                .build();
        return ResponseEntity.ok(projectTeamRepository.save(pt));
    }

    @DeleteMapping("/{projectId}/teams/{teamId}")
    public ResponseEntity<Void> removeProjectTeam(
            @PathVariable UUID projectId,
            @PathVariable UUID teamId) {
        projectTeamRepository.findByProjectIdAndTeamId(projectId, teamId)
                .ifPresent(projectTeamRepository::delete);
        return ResponseEntity.noContent().build();
    }
}

