package com.taskflow.modules.user.controller;

import com.taskflow.modules.user.domain.Team;
import com.taskflow.modules.user.domain.TeamMember;
import com.taskflow.modules.user.service.TeamService;
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

    @PostMapping
    public ResponseEntity<Team> createTeam(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Team name is required");
        }
        return ResponseEntity.ok(teamService.createTeam(name));
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

    @PostMapping("/{teamId}/members")
    public ResponseEntity<TeamMember> addMember(
            @PathVariable UUID teamId,
            @RequestBody Map<String, Object> body) {
        String userIdStr = (String) body.get("userId");
        String role = (String) body.get("role");
        if (userIdStr == null) {
            throw new IllegalArgumentException("userId is required");
        }
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(teamService.addMemberToTeam(teamId, userId, role));
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
}
