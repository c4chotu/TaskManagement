package com.taskflow.modules.user.controller;

import com.taskflow.modules.user.domain.Team;
import com.taskflow.modules.user.domain.TeamMember;
import com.taskflow.modules.user.service.TeamService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/teams")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    // ── Team CRUD ──────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<Team> createTeam(@RequestBody CreateTeamRequest body) {
        Team team;
        if (body.getDepartmentId() != null || body.getDescription() != null) {
            team = teamService.createTeamFull(body.getName(), body.getDescription(), body.getDepartmentId());
        } else {
            team = teamService.createTeam(body.getName());
        }
        return ResponseEntity.ok(team);
    }

    @GetMapping
    public ResponseEntity<List<Team>> listTeams() {
        return ResponseEntity.ok(teamService.listTeams());
    }

    @GetMapping("/{teamId}")
    public ResponseEntity<Team> getTeam(@PathVariable UUID teamId) {
        return ResponseEntity.ok(teamService.getTeam(teamId));
    }

    @DeleteMapping("/{teamId}")
    public ResponseEntity<Void> deleteTeam(@PathVariable UUID teamId) {
        teamService.deleteTeam(teamId);
        return ResponseEntity.noContent().build();
    }

    // ── Team Lead ──────────────────────────────────────────────────────

    /**
     * PUT /api/v1/teams/{teamId}/lead
     * Body: { "leadUserId": "<uuid>" }
     * Sets the team lead. The user is added as a member if not already one.
     */
    @PutMapping("/{teamId}/lead")
    public ResponseEntity<Team> updateTeamLead(
            @PathVariable UUID teamId,
            @RequestBody Map<String, String> body) {
        String leadUserIdStr = body.get("leadUserId");
        if (leadUserIdStr == null) {
            return ResponseEntity.badRequest().build();
        }
        Team updated = teamService.updateTeamLead(teamId, UUID.fromString(leadUserIdStr));
        return ResponseEntity.ok(updated);
    }

    // ── Member Transfer ────────────────────────────────────────────────

    /**
     * PUT /api/v1/teams/transfer-member
     * Body: { "userId": "<uuid>", "targetTeamId": "<uuid>" | null }
     * Moves a user to a different team (or to the pool if targetTeamId is null).
     */
    @PutMapping("/transfer-member")
    public ResponseEntity<Void> transferMember(@RequestBody TransferMemberRequest body) {
        UUID targetTeamId = body.getTargetTeamId() != null
                ? UUID.fromString(body.getTargetTeamId()) : null;
        teamService.transferMember(UUID.fromString(body.getUserId()), targetTeamId);
        return ResponseEntity.noContent().build();
    }

    /**
     * PUT /api/v1/teams/bulk-transfer
     * Body: { "userIds": ["<uuid>", ...], "targetTeamId": "<uuid>" | null }
     * Bulk-moves multiple users to a target team (or pool).
     */
    @PutMapping("/bulk-transfer")
    public ResponseEntity<Void> bulkTransfer(@RequestBody BulkTransferRequest body) {
        UUID targetTeamId = body.getTargetTeamId() != null
                ? UUID.fromString(body.getTargetTeamId()) : null;
        List<UUID> userIds = body.getUserIds().stream()
                .map(UUID::fromString)
                .toList();
        teamService.bulkTransferMembers(userIds, targetTeamId);
        return ResponseEntity.noContent().build();
    }

    // ── Member CRUD ────────────────────────────────────────────────────

    @PostMapping("/{teamId}/members")
    public ResponseEntity<TeamMember> addMember(
            @PathVariable UUID teamId,
            @RequestBody Map<String, Object> body) {
        String userIdStr = (String) body.get("userId");
        String role = (String) body.get("role");
        if (userIdStr == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(teamService.addMemberToTeam(teamId, UUID.fromString(userIdStr), role));
    }

    @DeleteMapping("/{teamId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable UUID teamId,
            @PathVariable UUID userId) {
        teamService.removeMemberFromTeam(teamId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{teamId}/members")
    public ResponseEntity<List<TeamMember>> listMembers(@PathVariable UUID teamId) {
        return ResponseEntity.ok(teamService.listTeamMembers(teamId));
    }

    // ── Request Bodies ─────────────────────────────────────────────────

    @Data
    public static class CreateTeamRequest {
        private String name;
        private String description;
        private String departmentId; // UUID as string
        private UUID getDepartmentIdAsUUID() {
            return departmentId != null ? UUID.fromString(departmentId) : null;
        }
        public UUID getDepartmentId() {
            try { return departmentId != null ? UUID.fromString(departmentId) : null; }
            catch (Exception e) { return null; }
        }
    }

    @Data
    public static class TransferMemberRequest {
        private String userId;
        private String targetTeamId; // null means pool/unassigned
    }

    @Data
    public static class BulkTransferRequest {
        private List<String> userIds;
        private String targetTeamId; // null means pool/unassigned
    }
}
