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
import java.util.Map;
import java.util.HashMap;
import java.util.Objects;
import java.util.UUID;
import com.taskflow.modules.task.repository.TaskActivityRepository;
import com.taskflow.modules.task.repository.TaskRepository;
import com.taskflow.modules.task.repository.CustomTaskStatusRepository;
import com.taskflow.modules.auth.repository.UserRepository;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskActivityRepository taskActivityRepository;
    private final TaskRepository taskRepository;
    private final CustomTaskStatusRepository customTaskStatusRepository;
    private final UserRepository userRepository;

    public ProjectService(ProjectRepository projectRepository,
                          ProjectMemberRepository projectMemberRepository,
                          TaskActivityRepository taskActivityRepository,
                          TaskRepository taskRepository,
                          CustomTaskStatusRepository customTaskStatusRepository,
                          UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.taskActivityRepository = taskActivityRepository;
        this.taskRepository = taskRepository;
        this.customTaskStatusRepository = customTaskStatusRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Project createProject(String name, String description, String type, Instant startDate, Instant endDate,
                                 java.util.List<String> features, java.util.List<String> techStack, String specification) {
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
            .specification(specification)
            .features(features)
            .techStack(techStack)
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
    public Project updateProject(UUID projectId, String name, String description, String status, String type, Instant startDate, Instant endDate,
                                 java.util.List<String> features, java.util.List<String> techStack, String specification) {
        Project project = getProject(projectId); // Performs tenant and project membership verification
        
        // Ensure user is OWNER or MANAGER to update
        verifyRoleRequirement(projectId, List.of("PROJECT_OWNER", "PROJECT_MANAGER"), "update project details");

        if (name != null) project.setName(name);
        if (description != null) project.setDescription(description);
        if (specification != null) project.setSpecification(specification);
        if (features != null) {
            if (project.getFeatures() == null) project.setFeatures(new java.util.ArrayList<>());
            project.getFeatures().clear();
            project.getFeatures().addAll(features);
        }
        if (techStack != null) {
            if (project.getTechStack() == null) project.setTechStack(new java.util.ArrayList<>());
            project.getTechStack().clear();
            project.getTechStack().addAll(techStack);
        }
        if (status != null) project.setStatus(status);
        if (type != null) project.setType(type);
        if (startDate != null) project.setStartDate(startDate);
        if (endDate != null) project.setEndDate(endDate);

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

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getProjectActivities(UUID projectId) {
        getProject(projectId); // Perform tenant and project access check
        
        List<com.taskflow.modules.task.domain.TaskActivity> activities = taskActivityRepository.findByProjectId(projectId);
        
        Map<UUID, String> userNames = new HashMap<>();
        Map<UUID, com.taskflow.modules.task.domain.Task> tasks = new HashMap<>();
        Map<UUID, String> statusNames = new HashMap<>();
        
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        
        for (com.taskflow.modules.task.domain.TaskActivity act : activities) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", act.getId().toString());
            
            String fType = "status_changed";
            String type = act.getActivityType();
            if ("CREATE".equals(type)) {
                fType = "task_created";
            } else if ("COMMENT_ADD".equals(type)) {
                fType = "comment_added";
            }
            map.put("type", fType);
            map.put("taskId", act.getTaskId().toString());
            
            com.taskflow.modules.task.domain.Task task = tasks.computeIfAbsent(act.getTaskId(), id -> 
                taskRepository.findById(id).orElse(null)
            );
            if (task != null) {
                map.put("taskTitle", task.getTitle());
                map.put("taskDisplayId", task.getDisplayId());
            } else {
                map.put("taskTitle", "Unknown Task");
                map.put("taskDisplayId", "T-???");
            }
            
            String actorName = userNames.computeIfAbsent(act.getUserId(), uid -> {
                return userRepository.findById(uid)
                    .map(u -> u.getName())
                    .orElse("System");
            });
            map.put("actor", actorName);
            map.put("at", act.getCreatedAt().toString());
            
            String message = act.getDescription();
            if ("STATUS_CHANGE".equals(type)) {
                String fromStatus = "Unknown";
                String toStatus = "Unknown";
                
                try {
                    if (act.getOldValue() != null && !act.getOldValue().isEmpty()) {
                        UUID fromId = UUID.fromString(act.getOldValue());
                        fromStatus = statusNames.computeIfAbsent(fromId, sid -> 
                            customTaskStatusRepository.findById(sid)
                                .map(s -> s.getName())
                                .orElse("Unknown")
                        );
                    }
                } catch (Exception ignored) {}
                
                try {
                    if (act.getNewValue() != null && !act.getNewValue().isEmpty()) {
                        UUID toId = UUID.fromString(act.getNewValue());
                        toStatus = statusNames.computeIfAbsent(toId, sid -> 
                            customTaskStatusRepository.findById(sid)
                                .map(s -> s.getName())
                                .orElse("Unknown")
                        );
                    }
                } catch (Exception ignored) {}
                
                map.put("from", fromStatus);
                map.put("to", toStatus);
                message = "changed status";
            } else if ("ASSIGNMENT_ADD".equals(type)) {
                String assignedUser = "Unknown User";
                try {
                    if (act.getNewValue() != null && !act.getNewValue().isEmpty()) {
                        UUID assignedUid = UUID.fromString(act.getNewValue());
                        assignedUser = userNames.computeIfAbsent(assignedUid, uid -> 
                            userRepository.findById(uid)
                                .map(u -> u.getName())
                                .orElse("Unknown User")
                        );
                    }
                } catch (Exception ignored) {}
                message = "assigned task to " + assignedUser;
            } else if ("ASSIGNMENT_REMOVE".equals(type)) {
                String unassignedUser = "Unknown User";
                try {
                    if (act.getOldValue() != null && !act.getOldValue().isEmpty()) {
                        UUID unassignedUid = UUID.fromString(act.getOldValue());
                        unassignedUser = userNames.computeIfAbsent(unassignedUid, uid -> 
                            userRepository.findById(uid)
                                .map(u -> u.getName())
                                .orElse("Unknown User")
                        );
                    }
                } catch (Exception ignored) {}
                message = "unassigned " + unassignedUser;
            } else if ("COMMENT_ADD".equals(type)) {
                message = "added a comment";
            } else if ("CREATE".equals(type)) {
                message = "created the task";
            } else if ("DESC_CHANGE".equals(type)) {
                message = "updated task description";
            } else if ("TITLE_CHANGE".equals(type)) {
                message = "updated task title";
            } else if ("PRIORITY_CHANGE".equals(type)) {
                message = "changed priority to " + act.getNewValue();
            } else {
                message = act.getDescription().toLowerCase();
            }
            
            map.put("message", message);
            result.add(map);
        }
        
        return result;
    }
}
