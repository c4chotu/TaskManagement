package com.taskflow.modules.project.service;

import com.taskflow.common.exception.UnauthorizedException;
import com.taskflow.common.security.AuthenticatedUser;
import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.project.domain.Project;
import com.taskflow.modules.project.domain.ProjectMember;
import com.taskflow.modules.project.repository.ProjectMemberRepository;
import com.taskflow.modules.project.repository.ProjectRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private ProjectMemberRepository projectMemberRepository;

    @InjectMocks
    private ProjectService projectService;

    private MockedStatic<SecurityContextHelper> mockedSecurityHelper;
    
    private UUID userId;
    private UUID orgId;
    private UUID projectId;
    private Project project;
    private AuthenticatedUser currentUser;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        orgId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        
        currentUser = AuthenticatedUser.builder()
                .id(userId)
                .email("test@company.com")
                .name("Alice")
                .orgId(orgId)
                .role("ROLE_ORG_MEMBER")
                .build();

        project = Project.builder()
                .id(projectId)
                .name("Test Project")
                .status("ACTIVE")
                .organizationId(orgId)
                .build();

        // Mock the static helper
        mockedSecurityHelper = Mockito.mockStatic(SecurityContextHelper.class);
        mockedSecurityHelper.when(SecurityContextHelper::getCurrentUserId).thenReturn(userId);
        mockedSecurityHelper.when(SecurityContextHelper::getCurrentOrgId).thenReturn(orgId);
        mockedSecurityHelper.when(SecurityContextHelper::getCurrentUser).thenReturn(currentUser);
    }

    @AfterEach
    void tearDown() {
        mockedSecurityHelper.close();
    }

    @Test
    void createProject_shouldAssignOwnerRole() {
        when(projectRepository.save(any(Project.class))).thenReturn(project);

        Project created = projectService.createProject("Test Project", "Desc", "KAIZEN", null, null);

        assertNotNull(created);
        verify(projectRepository, times(1)).save(any(Project.class));
        verify(projectMemberRepository, times(1)).save(argThat(member -> 
                member.getProjectId().equals(created.getId()) &&
                member.getUserId().equals(userId) &&
                "PROJECT_OWNER".equals(member.getRole())
        ));
    }

    @Test
    void updateProject_asOwner_shouldSucceed() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        
        ProjectMember owner = ProjectMember.builder()
                .projectId(projectId)
                .userId(userId)
                .role("PROJECT_OWNER")
                .build();
        when(projectMemberRepository.findByProjectIdAndUserId(projectId, userId)).thenReturn(Optional.of(owner));
        when(projectRepository.save(any(Project.class))).thenReturn(project);

        Project updated = projectService.updateProject(projectId, "New Name", "Desc", "ACTIVE", "KAIZEN", null, null);

        assertNotNull(updated);
        verify(projectRepository, times(1)).save(project);
    }

    @Test
    void updateProject_asViewer_shouldThrowUnauthorizedException() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        
        ProjectMember viewer = ProjectMember.builder()
                .projectId(projectId)
                .userId(userId)
                .role("VIEWER")
                .build();
        when(projectMemberRepository.findByProjectIdAndUserId(projectId, userId)).thenReturn(Optional.of(viewer));

        assertThrows(UnauthorizedException.class, () -> 
                projectService.updateProject(projectId, "New Name", "Desc", "ACTIVE", "KAIZEN", null, null)
        );
        
        verify(projectRepository, never()).save(any(Project.class));
    }

    @Test
    void deleteProject_asManager_shouldThrowUnauthorizedException() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        
        ProjectMember manager = ProjectMember.builder()
                .projectId(projectId)
                .userId(userId)
                .role("PROJECT_MANAGER")
                .build();
        when(projectMemberRepository.findByProjectIdAndUserId(projectId, userId)).thenReturn(Optional.of(manager));

        assertThrows(UnauthorizedException.class, () -> 
                projectService.deleteProject(projectId)
        );
        
        verify(projectRepository, never()).delete(any(Project.class));
    }
}
