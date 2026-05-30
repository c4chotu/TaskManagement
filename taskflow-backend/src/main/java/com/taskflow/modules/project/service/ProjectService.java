package com.taskflow.modules.project.service;

import com.taskflow.common.exception.EntityNotFoundException;
import com.taskflow.common.exception.TenantIsolationException;
import com.taskflow.common.exception.UnauthorizedException;
import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.project.domain.Project;
import com.taskflow.modules.project.domain.ProjectMember;
import com.taskflow.modules.project.repository.ProjectMemberRepository;
import com.taskflow.modules.project.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;

    public ProjectService(ProjectRepository projectRepository, ProjectMemberRepository projectMemberRepository) {
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
    }

    @Transactional
    public Project createProject(String name, String description, String type, Instant startDate, Instant endDate) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        UUID userId = SecurityContextHelper.getCurrentUserId();
        if (orgId == null || userId == null) {
            throw new TenantIsolationException("Cannot create project without authenticated user and organization context");
        }

        UUID projectId = UUID.randomUUID();
        String projectKey = name.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
        if (projectKey.isEmpty()) projectKey = "PROJ";
        if (projectKey.length() > 8) projectKey = projectKey.substring(0, 8);

        Project project = Project.builder()
                .id(projectId)
                .name(name)
                .key(projectKey)
                .description(description)
                .status("ACTIVE")
                .type(type)
                .startDate(startDate)
                .endDate(endDate)
                .organizationId(orgId)
                .taskCounter(0)
                .build();

        Project savedProject = projectRepository.save(project);

        // Auto-assign creator as PROJECT_OWNER
        ProjectMember owner = ProjectMember.builder()
                .id(UUID.randomUUID())
                .projectId(savedProject.getId())
                .userId(userId)
                .role("PROJECT_OWNER")
                .build();
        projectMemberRepository.save(owner);

        return savedProject;
    }

    @Transactional(readOnly = true)
    public Project getProject(UUID projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found with ID: " + projectId));
        
        verifyTenantAccess(project.getOrganizationId());
        verifyProjectAccess(projectId);
        
        return project;
    }

    @Transactional(readOnly = true)
    public List<Project> listProjects() {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        UUID userId = SecurityContextHelper.getCurrentUserId();
        if (orgId == null || userId == null) {
            throw new TenantIsolationException("Unauthorized access request");
        }
        return projectRepository.findMyProjects(orgId, userId);
    }

    @Transactional
    public Project updateProject(UUID projectId, String name, String description, String status, String type, Instant startDate, Instant endDate) {
        Project project = getProject(projectId); // Performs tenant and project membership verification
        
        // Ensure user is OWNER or MANAGER to update
        verifyRoleRequirement(projectId, List.of("PROJECT_OWNER", "PROJECT_MANAGER"), "update project details");

        project.setName(name);
        project.setDescription(description);
        project.setStatus(status);
        project.setType(type);
        project.setStartDate(startDate);
        project.setEndDate(endDate);

        return projectRepository.save(project);
    }

    @Transactional
    public void deleteProject(UUID projectId) {
        Project project = getProject(projectId); // Performs tenant and project membership verification
        
        // Ensure user is OWNER to delete
        verifyRoleRequirement(projectId, List.of("PROJECT_OWNER"), "delete project");

        projectRepository.delete(project);
    }

    @Transactional
    public ProjectMember addMember(UUID projectId, UUID userId, String role) {
        getProject(projectId); // Performs tenant and membership check for active user
        
        // Ensure active user is OWNER or MANAGER to invite members
        verifyRoleRequirement(projectId, List.of("PROJECT_OWNER", "PROJECT_MANAGER"), "add members");

        if (projectMemberRepository.findByProjectIdAndUserId(projectId, userId).isPresent()) {
            throw new IllegalArgumentException("User is already a member of this project");
        }

        ProjectMember member = ProjectMember.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .userId(userId)
                .role(role != null ? role : "PROJECT_MEMBER")
                .build();

        return projectMemberRepository.save(member);
    }

    @Transactional
    public void removeMember(UUID projectId, UUID userId) {
        getProject(projectId); // Performs tenant and membership check for active user
        
        // Ensure active user is OWNER or MANAGER to remove members
        verifyRoleRequirement(projectId, List.of("PROJECT_OWNER", "PROJECT_MANAGER"), "remove members");

        // Cannot remove oneself if PROJECT_OWNER
        UUID currentUserId = SecurityContextHelper.getCurrentUserId();
        if (Objects.equals(currentUserId, userId)) {
            ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                    .orElseThrow(() -> new EntityNotFoundException("Project membership not found"));
            if ("PROJECT_OWNER".equals(member.getRole())) {
                throw new IllegalArgumentException("Project owner cannot remove themselves. Transfer ownership first.");
            }
        }

        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Project membership not found for user: " + userId));

        projectMemberRepository.delete(member);
    }

    @Transactional(readOnly = true)
    public List<ProjectMember> listMembers(UUID projectId) {
        getProject(projectId); // Performs tenant and membership check
        return projectMemberRepository.findByProjectId(projectId);
    }

    private void verifyTenantAccess(UUID orgId) {
        UUID currentOrgId = SecurityContextHelper.getCurrentOrgId();
        if (currentOrgId == null || !Objects.equals(currentOrgId, orgId)) {
            throw new TenantIsolationException("Unauthorized cross-tenant access request blocked");
        }
    }

    private void verifyProjectAccess(UUID projectId) {
        UUID currentUserId = SecurityContextHelper.getCurrentUserId();
        if (currentUserId == null) {
            throw new UnauthorizedException("Authenticated session context required");
        }
        projectMemberRepository.findByProjectIdAndUserId(projectId, currentUserId)
                .orElseThrow(() -> new UnauthorizedException("User is not a member of this project"));
    }

    private void verifyRoleRequirement(UUID projectId, List<String> requiredRoles, String action) {
        UUID currentUserId = SecurityContextHelper.getCurrentUserId();
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, currentUserId)
                .orElseThrow(() -> new UnauthorizedException("User is not a member of this project"));
        
        if (!requiredRoles.contains(member.getRole())) {
            throw new UnauthorizedException("User lacks necessary project-level permission (" + String.join("/", requiredRoles) + ") to " + action);
        }
    }
}
