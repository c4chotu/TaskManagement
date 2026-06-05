package com.taskflow.modules.user.service;

import com.taskflow.common.exception.EntityNotFoundException;
import com.taskflow.common.exception.TenantIsolationException;
import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.user.domain.Team;
import com.taskflow.modules.user.domain.TeamMember;
import com.taskflow.modules.user.repository.TeamMemberRepository;
import com.taskflow.modules.user.repository.TeamRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;

    public TeamService(TeamRepository teamRepository, TeamMemberRepository teamMemberRepository) {
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
    }

    // ── Create ─────────────────────────────────────────────────────────

    @Transactional
    public Team createTeam(String name) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) throw new TenantIsolationException("Cannot create team without organization context");
        Team team = Team.builder()
                .id(UUID.randomUUID())
                .name(name)
                .organizationId(orgId)
                .build();
        return teamRepository.save(team);
    }

    @Transactional
    public Team createTeamFull(String name, String description, UUID departmentId) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) throw new TenantIsolationException("Cannot create team without organization context");
        Team team = Team.builder()
                .id(UUID.randomUUID())
                .name(name)
                .description(description)
                .departmentId(departmentId)
                .organizationId(orgId)
                .build();
        return teamRepository.save(team);
    }

    // ── Read ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Team getTeam(UUID teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found with ID: " + teamId));
        verifyTenantAccess(team.getOrganizationId());
        return team;
    }

    @Transactional(readOnly = true)
    public List<Team> listTeams() {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) throw new TenantIsolationException("Cannot query teams without organization context");
        return teamRepository.findByOrganizationId(orgId);
    }

    @Transactional(readOnly = true)
    public List<TeamMember> listTeamMembers(UUID teamId) {
        getTeam(teamId); // verifies tenant
        return teamMemberRepository.findByTeamId(teamId);
    }

    // ── Team Lead Management ───────────────────────────────────────────

    /**
     * Set the lead user of a team.
     * If the user is not yet a member they are automatically added with role LEAD.
     * The previous lead (if any) keeps their membership but reverts to MEMBER role.
     */
    @Transactional
    public Team updateTeamLead(UUID teamId, UUID leadUserId) {
        Team team = getTeam(teamId);

        // Downgrade old lead to MEMBER if different
        if (team.getLeadUserId() != null && !team.getLeadUserId().equals(leadUserId)) {
            teamMemberRepository.findByTeamIdAndUserId(teamId, team.getLeadUserId())
                    .ifPresent(old -> { old.setRole("MEMBER"); teamMemberRepository.save(old); });
        }

        // Promote new lead
        teamMemberRepository.findByTeamIdAndUserId(teamId, leadUserId).ifPresentOrElse(
            existing -> { existing.setRole("LEAD"); teamMemberRepository.save(existing); },
            () -> teamMemberRepository.save(TeamMember.builder()
                    .id(UUID.randomUUID()).teamId(teamId).userId(leadUserId).role("LEAD").build())
        );

        team.setLeadUserId(leadUserId);
        return teamRepository.save(team);
    }

    // ── Member Transfer ────────────────────────────────────────────────

    /**
     * Transfer a user to a different team.
     * targetTeamId = null → removes the user from all teams (pool/unassigned).
     */
    @Transactional
    public void transferMember(UUID userId, UUID targetTeamId) {
        // Remove from all current teams and clear any lead designations
        List<TeamMember> memberships = teamMemberRepository.findByUserId(userId);
        for (TeamMember tm : memberships) {
            teamRepository.findById(tm.getTeamId()).ifPresent(t -> {
                if (userId.equals(t.getLeadUserId())) {
                    t.setLeadUserId(null);
                    teamRepository.save(t);
                }
            });
        }
        teamMemberRepository.deleteAll(memberships);

        // Assign to target team
        if (targetTeamId != null) {
            Team target = getTeam(targetTeamId);
            teamMemberRepository.save(TeamMember.builder()
                    .id(UUID.randomUUID())
                    .teamId(target.getId())
                    .userId(userId)
                    .role("MEMBER")
                    .build());
        }
    }

    /**
     * Bulk-transfer a list of users to the same target team.
     * targetTeamId = null → move them all to the unassigned pool.
     */
    @Transactional
    public void bulkTransferMembers(List<UUID> userIds, UUID targetTeamId) {
        for (UUID uid : userIds) {
            transferMember(uid, targetTeamId);
        }
    }

    // ── Member CRUD ────────────────────────────────────────────────────

    @Transactional
    public TeamMember addMemberToTeam(UUID teamId, UUID userId, String role) {
        getTeam(teamId); // tenant check
        if (teamMemberRepository.findByTeamIdAndUserId(teamId, userId).isPresent()) {
            throw new IllegalArgumentException("User is already a member of this team");
        }
        TeamMember member = TeamMember.builder()
                .id(UUID.randomUUID())
                .teamId(teamId)
                .userId(userId)
                .role(role != null ? role : "MEMBER")
                .build();
        return teamMemberRepository.save(member);
    }

    @Transactional
    public void removeMemberFromTeam(UUID teamId, UUID userId) {
        getTeam(teamId); // tenant check
        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Team membership not found for user: " + userId));
        teamMemberRepository.delete(member);
    }

    @Transactional
    public void deleteTeam(UUID teamId) {
        Team team = getTeam(teamId);
        teamRepository.delete(team);
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private void verifyTenantAccess(UUID orgId) {
        UUID currentOrgId = SecurityContextHelper.getCurrentOrgId();
        if (currentOrgId == null || !Objects.equals(currentOrgId, orgId)) {
            throw new TenantIsolationException("Unauthorized cross-tenant access request blocked");
        }
    }
}
