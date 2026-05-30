package com.taskflow.modules.user.controller;

import com.taskflow.common.security.AuthenticatedUser;
import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.user.dto.UpdateProfileRequest;
import com.taskflow.modules.user.dto.UserProfileResponse;
import com.taskflow.modules.user.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserProfileService userProfileService;

    public UserController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMyProfile() {
        AuthenticatedUser user = SecurityContextHelper.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(userProfileService.getOrCreateProfile(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole(),
                user.getOrgId()
        ));
    }

    @PatchMapping("/me")
    public ResponseEntity<UserProfileResponse> updateMyProfile(@Valid @RequestBody UpdateProfileRequest request) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(userProfileService.updateProfile(userId, request));
    }

    @GetMapping
    public ResponseEntity<List<UserProfileResponse>> listUsers() {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(userProfileService.getUsersByOrganization(orgId));
    }

    @PostMapping("/{userId}/role")
    public ResponseEntity<UserProfileResponse> promoteUser(
            @PathVariable UUID userId,
            @RequestBody PromoteUserRequest request) {
        UUID actorId = SecurityContextHelper.getCurrentUserId();
        if (actorId == null) {
            return ResponseEntity.status(401).build();
        }
        UserProfileResponse updated = userProfileService.promoteUser(userId, request.getRoleName(), request.getRoleLevel(), actorId);
        return ResponseEntity.ok(updated);
    }

    @PostMapping
    public ResponseEntity<UserProfileResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        UUID actorId = SecurityContextHelper.getCurrentUserId();
        if (orgId == null || actorId == null) {
            return ResponseEntity.status(401).build();
        }
        
        UserProfileResponse response = userProfileService.createUser(
                request.getName(),
                request.getEmail(),
                request.getPassword() != null ? request.getPassword() : "password123",
                request.getRoleName() != null ? request.getRoleName() : "TEAM_MEMBER",
                orgId,
                request.getTeamId(),
                request.getDepartmentId(),
                actorId
        );
        return ResponseEntity.ok(response);
    }

    @Data
    public static class PromoteUserRequest {
        private String roleName;
        private int roleLevel;
    }

    @Data
    public static class CreateUserRequest {
        @jakarta.validation.constraints.NotBlank(message = "Name is required")
        private String name;

        @jakarta.validation.constraints.NotBlank(message = "Email is required")
        @jakarta.validation.constraints.Email(message = "Email must be a valid format")
        private String email;

        private String password;
        private String roleName;
        private UUID teamId;
        private UUID departmentId;
    }
}
