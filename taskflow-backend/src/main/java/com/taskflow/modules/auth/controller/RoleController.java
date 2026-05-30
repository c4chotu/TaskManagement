package com.taskflow.modules.auth.controller;

import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.auth.domain.User;
import com.taskflow.modules.auth.domain.UserRole;
import com.taskflow.modules.auth.service.RoleHierarchyService;
import com.taskflow.modules.user.domain.Department;
import com.taskflow.modules.user.domain.Team;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class RoleController {

    private final RoleHierarchyService roleHierarchyService;

    public RoleController(RoleHierarchyService roleHierarchyService) {
        this.roleHierarchyService = roleHierarchyService;
    }

    @PostMapping("/roles/assign")
    public ResponseEntity<UserRole> assignRole(@RequestBody RoleAssignmentRequest request) {
        UUID actorId = SecurityContextHelper.getCurrentUserId();
        if (actorId == null) {
            return ResponseEntity.status(401).build();
        }
        UserRole userRole = roleHierarchyService.assignRole(
                request.getUserId(),
                request.getRoleLevel(),
                request.getRoleName(),
                request.getDepartmentId(),
                request.getTeamId(),
                actorId
        );
        return ResponseEntity.ok(userRole);
    }

    @GetMapping("/roles/user/{userId}")
    public ResponseEntity<List<UserRole>> getUserRoles(@PathVariable UUID userId) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(roleHierarchyService.getRolesForUser(userId, orgId));
    }

    @DeleteMapping("/roles/{roleId}")
    public ResponseEntity<Void> revokeRole(@PathVariable UUID roleId) {
        UUID actorId = SecurityContextHelper.getCurrentUserId();
        if (actorId == null) {
            return ResponseEntity.status(401).build();
        }
        roleHierarchyService.revokeRole(roleId, actorId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/roles/hierarchy")
    public ResponseEntity<Map<String, Object>> getRoleHierarchy() {
        // Return a mock/static representation of the defined hierarchy matrix
        Map<String, Object> hierarchy = new HashMap<>();
        hierarchy.put("5", "ORG_OWNER");
        hierarchy.put("4", "ORG_ADMIN");
        hierarchy.put("3", "DEPT_HEAD");
        hierarchy.put("2", "TEAM_LEAD");
        hierarchy.put("1", "TEAM_MEMBER");
        hierarchy.put("0", "GUEST");
        return ResponseEntity.ok(hierarchy);
    }

    @GetMapping("/roles/subordinates")
    public ResponseEntity<List<User>> getSubordinates() {
        UUID actorId = SecurityContextHelper.getCurrentUserId();
        if (actorId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(roleHierarchyService.getSubordinates(actorId));
    }

    @GetMapping("/departments")
    public ResponseEntity<List<Department>> listDepartments() {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(roleHierarchyService.getDepartmentsByOrganization(orgId));
    }

    @PostMapping("/departments")
    public ResponseEntity<Department> createDepartment(@RequestBody DepartmentRequest request) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            return ResponseEntity.status(401).build();
        }
        Department dept = roleHierarchyService.createDepartment(
                request.getName(),
                request.getDescription(),
                request.getHeadUserId(),
                request.getParentDepartmentId(),
                orgId
        );
        return ResponseEntity.ok(dept);
    }

    @PutMapping("/departments/{id}")
    public ResponseEntity<Department> updateDepartment(@PathVariable UUID id, @RequestBody DepartmentRequest request) {
        Department dept = roleHierarchyService.updateDepartment(
                id,
                request.getName(),
                request.getDescription(),
                request.getHeadUserId(),
                request.getParentDepartmentId()
        );
        return ResponseEntity.ok(dept);
    }

    @DeleteMapping("/departments/{id}")
    public ResponseEntity<Void> deleteDepartment(@PathVariable UUID id) {
        roleHierarchyService.deleteDepartment(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/departments/{id}/teams")
    public ResponseEntity<Team> createTeamInDepartment(@PathVariable UUID id, @RequestBody TeamRequest request) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            return ResponseEntity.status(401).build();
        }
        Team team = roleHierarchyService.createTeamInDepartment(
                id,
                request.getName(),
                request.getDescription(),
                request.getLeadUserId(),
                orgId
        );
        return ResponseEntity.ok(team);
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/organizations/bootstrap")
    public ResponseEntity<Map<String, Object>> bootstrapOrganization(@RequestBody Map<String, Object> body) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        UUID actorId = SecurityContextHelper.getCurrentUserId();
        if (orgId == null || actorId == null) {
            return ResponseEntity.status(401).build();
        }

        Map<String, Object> orgData = (Map<String, Object>) body.get("organization");
        String orgName = orgData != null ? (String) orgData.get("name") : "New Organization";
        String tier = orgData != null && orgData.containsKey("tier") ? (String) orgData.get("tier") : "FREE";

        List<Map<String, String>> departments = (List<Map<String, String>>) body.get("departments");
        List<Map<String, String>> teams = (List<Map<String, String>>) body.get("teams");
        List<Map<String, String>> members = (List<Map<String, String>>) body.get("members");

        roleHierarchyService.bootstrapOrganization(
                orgId,
                orgName,
                tier,
                departments != null ? departments : Collections.emptyList(),
                teams != null ? teams : Collections.emptyList(),
                members != null ? members : Collections.emptyList(),
                actorId
        );

        Map<String, Object> response = new HashMap<>();
        response.put("ok", true);
        return ResponseEntity.ok(response);
    }

    @Data
    public static class RoleAssignmentRequest {
        private UUID userId;
        private int roleLevel;
        private String roleName;
        private UUID departmentId;
        private UUID teamId;
    }

    @Data
    public static class DepartmentRequest {
        private String name;
        private String description;
        private UUID headUserId;
        private UUID parentDepartmentId;
    }

    @Data
    public static class TeamRequest {
        private String name;
        private String description;
        private UUID leadUserId;
    }
}
