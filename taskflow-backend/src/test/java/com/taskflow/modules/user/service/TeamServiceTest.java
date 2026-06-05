package com.taskflow.modules.user.service;

import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.user.domain.Team;
import com.taskflow.modules.user.domain.TeamMember;
import com.taskflow.modules.user.repository.TeamMemberRepository;
import com.taskflow.modules.user.repository.TeamRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TeamServiceTest {

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @InjectMocks
    private TeamService teamService;

    private MockedStatic<SecurityContextHelper> mockedSecurityHelper;

    private UUID orgId;
    private UUID teamId;
    private Team team;

    @BeforeEach
    void setUp() {
        orgId = UUID.randomUUID();
        teamId = UUID.randomUUID();

        team = Team.builder()
                .id(teamId)
                .name("Engineering")
                .organizationId(orgId)
                .build();

        mockedSecurityHelper = Mockito.mockStatic(SecurityContextHelper.class);
        mockedSecurityHelper.when(SecurityContextHelper::getCurrentOrgId).thenReturn(orgId);
    }

    @AfterEach
    void tearDown() {
        mockedSecurityHelper.close();
    }

    @Test
    void createTeamFull_shouldSucceed() {
        UUID deptId = UUID.randomUUID();
        when(teamRepository.save(any(Team.class))).thenReturn(team);

        Team created = teamService.createTeamFull("Engineering", "Engineering Team", deptId);

        assertNotNull(created);
        verify(teamRepository, times(1)).save(argThat(t ->
                "Engineering".equals(t.getName()) &&
                "Engineering Team".equals(t.getDescription()) &&
                deptId.equals(t.getDepartmentId()) &&
                orgId.equals(t.getOrganizationId())
        ));
    }

    @Test
    void updateTeamLead_shouldSucceed() {
        UUID newLeadUserId = UUID.randomUUID();
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeamIdAndUserId(teamId, newLeadUserId)).thenReturn(Optional.empty());
        when(teamRepository.save(any(Team.class))).thenReturn(team);

        teamService.updateTeamLead(teamId, newLeadUserId);

        verify(teamMemberRepository, times(1)).save(argThat(tm ->
                tm.getTeamId().equals(teamId) &&
                tm.getUserId().equals(newLeadUserId) &&
                "LEAD".equals(tm.getRole())
        ));
        assertEquals(newLeadUserId, team.getLeadUserId());
    }

    @Test
    void transferMember_toAnotherTeam_shouldSucceed() {
        UUID userId = UUID.randomUUID();
        UUID targetTeamId = UUID.randomUUID();
        Team targetTeam = Team.builder().id(targetTeamId).organizationId(orgId).build();

        TeamMember oldMembership = TeamMember.builder()
                .id(UUID.randomUUID())
                .teamId(teamId)
                .userId(userId)
                .role("MEMBER")
                .build();

        when(teamMemberRepository.findByUserId(userId)).thenReturn(List.of(oldMembership));
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(teamRepository.findById(targetTeamId)).thenReturn(Optional.of(targetTeam));

        teamService.transferMember(userId, targetTeamId);

        verify(teamMemberRepository, times(1)).deleteAll(argThat(iter -> {
            List<TeamMember> list = (List<TeamMember>) iter;
            return list.size() == 1 && list.get(0).getTeamId().equals(teamId);
        }));
        verify(teamMemberRepository, times(1)).save(argThat(tm ->
                tm.getTeamId().equals(targetTeamId) &&
                tm.getUserId().equals(userId) &&
                "MEMBER".equals(tm.getRole())
        ));
    }

    @Test
    void transferMember_toPool_shouldSucceed() {
        UUID userId = UUID.randomUUID();

        TeamMember oldMembership = TeamMember.builder()
                .id(UUID.randomUUID())
                .teamId(teamId)
                .userId(userId)
                .role("MEMBER")
                .build();

        when(teamMemberRepository.findByUserId(userId)).thenReturn(List.of(oldMembership));
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));

        teamService.transferMember(userId, null);

        verify(teamMemberRepository, times(1)).deleteAll(argThat(iter -> {
            List<TeamMember> list = (List<TeamMember>) iter;
            return list.size() == 1 && list.get(0).getTeamId().equals(teamId);
        }));
        verify(teamMemberRepository, never()).save(any(TeamMember.class));
    }
}

