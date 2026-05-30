package com.taskflow.modules.user.controller;

import com.taskflow.modules.user.service.BulkUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/bulk")
@RequiredArgsConstructor
public class BulkUploadController {

    private final BulkUploadService bulkUploadService;

    /** POST /api/v1/bulk/teams — CSV: name,description */
    @PostMapping(value = "/teams", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BulkUploadService.BulkUploadResult> uploadTeams(
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(bulkUploadService.uploadTeams(file));
    }

    /** POST /api/v1/bulk/people — CSV: name,email,password,roleName,teamName,departmentName */
    @PostMapping(value = "/people", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BulkUploadService.BulkUploadResult> uploadPeople(
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(bulkUploadService.uploadPeople(file));
    }

    /** POST /api/v1/bulk/tasks — CSV: projectKey,title,description,priority,type,dueDate,assigneeEmail */
    @PostMapping(value = "/tasks", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BulkUploadService.BulkUploadResult> uploadTasks(
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(bulkUploadService.uploadTasks(file));
    }

    /** POST /api/v1/bulk/assignments — CSV: taskDisplayId,assigneeEmail */
    @PostMapping(value = "/assignments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BulkUploadService.BulkUploadResult> uploadAssignments(
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(bulkUploadService.uploadAssignments(file));
    }
}
