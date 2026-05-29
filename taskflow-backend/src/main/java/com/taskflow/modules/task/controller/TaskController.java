package com.taskflow.modules.task.controller;

import com.taskflow.modules.task.domain.Comment;
import com.taskflow.modules.task.domain.CustomField;
import com.taskflow.modules.task.domain.CustomFieldValue;
import com.taskflow.modules.task.domain.TaskAssignment;
import com.taskflow.modules.task.domain.TaskDependency;
import com.taskflow.modules.task.dto.*;
import com.taskflow.modules.task.service.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tasks")
@Validated
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(taskService.createTask(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> getTask(@PathVariable UUID id) {
        return ResponseEntity.ok(taskService.getTask(id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<TaskResponse> updateTask(@PathVariable UUID id, @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(taskService.updateTask(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable UUID id) {
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<TaskResponse>> listTasks(@RequestParam UUID projectId) {
        return ResponseEntity.ok(taskService.listTasks(projectId));
    }

    @PostMapping("/{id}/assignees")
    public ResponseEntity<TaskAssignment> assignTask(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body) {
        String userIdStr = (String) body.get("userId");
        String role = (String) body.get("role");
        if (userIdStr == null) {
            throw new IllegalArgumentException("userId is required");
        }
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(taskService.assignTask(id, userId, role));
    }

    @DeleteMapping("/{id}/assignees/{userId}")
    public ResponseEntity<Void> unassignTask(
            @PathVariable UUID id,
            @PathVariable UUID userId) {
        taskService.unassignTask(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/dependencies")
    public ResponseEntity<TaskDependency> addDependency(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body) {
        String predecessorIdStr = (String) body.get("predecessorId");
        String dependencyType = (String) body.get("dependencyType");
        if (predecessorIdStr == null) {
            throw new IllegalArgumentException("predecessorId is required");
        }
        UUID predecessorId = UUID.fromString(predecessorIdStr);
        return ResponseEntity.ok(taskService.addDependency(id, predecessorId, dependencyType));
    }

    @DeleteMapping("/{id}/dependencies/{predecessorId}")
    public ResponseEntity<Void> removeDependency(
            @PathVariable UUID id,
            @PathVariable UUID predecessorId) {
        taskService.removeDependency(id, predecessorId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<Comment> addComment(
            @PathVariable UUID id,
            @Valid @RequestBody CommentRequest request) {
        return ResponseEntity.ok(taskService.addComment(id, request.getContent()));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<Comment>> getComments(@PathVariable UUID id) {
        return ResponseEntity.ok(taskService.getComments(id));
    }

    @PostMapping("/{id}/custom-fields/{fieldId}")
    public ResponseEntity<CustomFieldValue> setCustomFieldValue(
            @PathVariable UUID id,
            @PathVariable UUID fieldId,
            @RequestBody Map<String, String> body) {
        String value = body.get("value");
        return ResponseEntity.ok(taskService.setCustomFieldValue(id, fieldId, value));
    }

    // Projects-scoped custom field endpoints
    @GetMapping("/projects/{projectId}/custom-fields")
    public ResponseEntity<List<CustomField>> listCustomFields(@PathVariable UUID projectId) {
        return ResponseEntity.ok(taskService.listCustomFields(projectId));
    }

    @PostMapping("/projects/{projectId}/custom-fields")
    public ResponseEntity<CustomField> createCustomField(
            @PathVariable UUID projectId,
            @Valid @RequestBody CustomFieldRequest request) {
        return ResponseEntity.ok(taskService.createCustomField(projectId, request));
    }
}
