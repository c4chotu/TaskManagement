package com.taskflow.modules.project.controller;

import com.taskflow.common.exception.UnauthorizedException;
import com.taskflow.common.security.AuthenticatedUser;
import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.project.domain.ProjectJoinRequest;
import com.taskflow.modules.project.domain.ProjectMember;
import com.taskflow.modules.project.repository.ProjectJoinRequestRepository;
import com.taskflow.modules.project.repository.ProjectMemberRepository;
import com.taskflow.modules.project.repository.ProjectRepository;
import com.taskflow.modules.auth.domain.UserRole;
import com.taskflow.modules.auth.repository.UserRoleRepository;
import com.taskflow.modules.auth.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class CollaborationController {

    private final ProjectJoinRequestRepository requestRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;

    @GetMapping("/{projectId}/collaboration/requests")
    public ResponseEntity<List<Map<String, Object>>> getRequests(@PathVariable UUID projectId) {
        // Find pending requests and include user details
        List<ProjectJoinRequest> requests = requestRepository.findByProjectIdAndStatus(projectId, "PENDING");
        var response = requests.stream().map(req -> {
            var user = userRepository.findById(req.getUserId()).orElse(null);
            var requester = userRepository.findById(req.getRequesterId()).orElse(null);
            return Map.of(
                    "id", req.getId(),
                    "projectId", req.getProjectId(),
                    "status", req.getStatus(),
                    "createdAt", req.getCreatedAt(),
                    "user", user != null ? Map.of("id", user.getId(), "name", user.getName(), "email", user.getEmail()) : null,
                    "requester", requester != null ? Map.of("id", requester.getId(), "name", requester.getName(), "email", requester.getEmail()) : null
            );
        }).collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{projectId}/collaboration/requests")
    @Transactional
    public ResponseEntity<ProjectJoinRequest> createRequest(@PathVariable UUID projectId, @RequestBody CreateRequestDto dto) {
        AuthenticatedUser current = SecurityContextHelper.getCurrentUser();
        if (current == null) {
            throw new UnauthorizedException("Not authenticated");
        }
        
        List<UserRole> roles = userRoleRepository.findByUserIdAndOrganizationId(current.getId(), current.getOrgId());
        boolean hasAdminRole = roles.stream().anyMatch(r -> r.getRoleLevel() >= 4 || "SUPER_ADMIN".equals(r.getRoleName()));
        
        if (!hasAdminRole) {
            throw new UnauthorizedException("Insufficient privileges to create collaboration requests");
        }

        UUID userId = dto.getUserId();
        
        // Ensure not already a member
        if (projectMemberRepository.findByProjectIdAndUserId(projectId, userId).isPresent()) {
            throw new IllegalArgumentException("User is already a member of this project");
        }

        ProjectJoinRequest req = ProjectJoinRequest.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .userId(userId)
                .requesterId(current.getId())
                .status("PENDING")
                .build();
        return ResponseEntity.ok(requestRepository.save(req));
    }

    @PostMapping("/collaboration/requests/{requestId}/approve")
    @Transactional
    public ResponseEntity<?> approveRequest(@PathVariable UUID requestId) {
        AuthenticatedUser current = SecurityContextHelper.getCurrentUser();
        if (current == null) {
            throw new UnauthorizedException("Not authenticated");
        }
        
        List<UserRole> roles = userRoleRepository.findByUserIdAndOrganizationId(current.getId(), current.getOrgId());
        boolean hasVpRole = roles.stream().anyMatch(r -> r.getRoleLevel() >= 5 || "SUPER_ADMIN".equals(r.getRoleName()));

        if (!hasVpRole) {
            throw new UnauthorizedException("Only VP / Organization Owners can approve collaboration requests");
        }

        ProjectJoinRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));
                
        if (!"PENDING".equals(req.getStatus())) {
            throw new IllegalArgumentException("Request is not pending");
        }

        req.setStatus("APPROVED");
        requestRepository.save(req);

        // Add to project_members
        if (projectMemberRepository.findByProjectIdAndUserId(req.getProjectId(), req.getUserId()).isEmpty()) {
            ProjectMember pm = ProjectMember.builder()
                    .id(UUID.randomUUID())
                    .projectId(req.getProjectId())
                    .userId(req.getUserId())
                    .role("MEMBER")
                    .build();
            projectMemberRepository.save(pm);
        }

        return ResponseEntity.ok(Map.of("message", "Request approved"));
    }

    @PostMapping("/collaboration/requests/{requestId}/reject")
    @Transactional
    public ResponseEntity<?> rejectRequest(@PathVariable UUID requestId) {
        AuthenticatedUser current = SecurityContextHelper.getCurrentUser();
        if (current == null) {
            throw new UnauthorizedException("Not authenticated");
        }
        
        List<UserRole> roles = userRoleRepository.findByUserIdAndOrganizationId(current.getId(), current.getOrgId());
        boolean hasVpRole = roles.stream().anyMatch(r -> r.getRoleLevel() >= 5 || "SUPER_ADMIN".equals(r.getRoleName()));

        if (!hasVpRole) {
            throw new UnauthorizedException("Only VP / Organization Owners can reject collaboration requests");
        }

        ProjectJoinRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));
                
        if (!"PENDING".equals(req.getStatus())) {
            throw new IllegalArgumentException("Request is not pending");
        }

        req.setStatus("REJECTED");
        requestRepository.save(req);

        return ResponseEntity.ok(Map.of("message", "Request rejected"));
    }

    @Data
    public static class CreateRequestDto {
        private UUID userId;
    }
}
