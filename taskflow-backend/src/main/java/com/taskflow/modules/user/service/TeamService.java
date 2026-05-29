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

    @Transactional
    public Team createTeam(String name) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            throw new TenantIsolationException("Cannot create team without organization context");
        }

        Team team = Team.builder()
                .id(UUID.randomUUID())
                .name(name)
                .organizationId(orgId)
                .build();
        return teamRepository.save(team);
    }

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
        if (orgId == null) {
            throw new TenantIsolationException("Cannot query teams without organization context");
        }
        return teamRepository.findByOrganizationId(orgId);
    }

    @Transactional
    public TeamMember addMemberToTeam(UUID teamId, UUID userId, String role) {
        Team team = getTeam(teamId); // Performs tenant verification
        
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
        getTeam(teamId); // Performs tenant verification
        
        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Team membership not found for user: " + userId));
        
        teamMemberRepository.delete(member);
    }

    @Transactional(readOnly = true)
    public List<TeamMember> listTeamMembers(UUID teamId) {
        getTeam(teamId); // Performs tenant verification
        return teamMemberRepository.findByTeamId(teamId);
    }

    @Transactional
    public void deleteTeam(UUID teamId) {
        Team team = getTeam(teamId); // Performs tenant verification
        teamRepository.delete(team);
    }

    private void verifyTenantAccess(UUID orgId) {
        UUID currentOrgId = SecurityContextHelper.getCurrentOrgId();
        if (currentOrgId == null || !Objects.equals(currentOrgId, orgId)) {
            throw new TenantIsolationException("Unauthorized cross-tenant access request blocked");
        }
    }
}
