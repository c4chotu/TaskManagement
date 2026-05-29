package com.taskflow.modules.task.service;

import com.taskflow.common.exception.EntityNotFoundException;
import com.taskflow.common.exception.TenantIsolationException;
import com.taskflow.common.exception.UnauthorizedException;
import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.project.domain.Project;
import com.taskflow.modules.project.domain.ProjectMember;
import com.taskflow.modules.project.repository.ProjectMemberRepository;
import com.taskflow.modules.project.repository.ProjectRepository;
import com.taskflow.modules.task.domain.*;
import com.taskflow.modules.task.dto.*;
import com.taskflow.modules.task.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final TaskStatusRepository taskStatusRepository;
    private final CustomTaskStatusRepository customTaskStatusRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final TaskDependencyRepository taskDependencyRepository;
    private final CommentRepository commentRepository;
    private final CustomFieldRepository customFieldRepository;
    private final CustomFieldValueRepository customFieldValueRepository;
    private final TaskActivityRepository taskActivityRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;

    private static final Logger log = LoggerFactory.getLogger(TaskService.class);

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private TaskRouterService taskRouterService;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private StatusWorkflowService statusWorkflowService;

    public TaskService(TaskRepository taskRepository,
                       TaskStatusRepository taskStatusRepository,
                       CustomTaskStatusRepository customTaskStatusRepository,
                       TaskAssignmentRepository taskAssignmentRepository,
                       TaskDependencyRepository taskDependencyRepository,
                       CommentRepository commentRepository,
                       CustomFieldRepository customFieldRepository,
                       CustomFieldValueRepository customFieldValueRepository,
                       TaskActivityRepository taskActivityRepository,
                       ProjectRepository projectRepository,
                       ProjectMemberRepository projectMemberRepository) {
        this.taskRepository = taskRepository;
        this.taskStatusRepository = taskStatusRepository;
        this.customTaskStatusRepository = customTaskStatusRepository;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.taskDependencyRepository = taskDependencyRepository;
        this.commentRepository = commentRepository;
        this.customFieldRepository = customFieldRepository;
        this.customFieldValueRepository = customFieldValueRepository;
        this.taskActivityRepository = taskActivityRepository;
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
    }

    @Transactional
    public TaskResponse createTask(TaskRequest request) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        UUID currentUserId = SecurityContextHelper.getCurrentUserId();
        if (orgId == null || currentUserId == null) {
            throw new TenantIsolationException("Cannot create task without authenticated user and organization context");
        }

        // Verify project existence and tenant
        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new EntityNotFoundException("Project not found with ID: " + request.getProjectId()));
        if (!Objects.equals(project.getOrganizationId(), orgId)) {
            throw new TenantIsolationException("Unauthorized cross-tenant access request blocked");
        }

        // Verify active user project membership and role (VIEWER cannot create tasks)
        verifyRoleRequirement(request.getProjectId(), List.of("PROJECT_OWNER", "PROJECT_MANAGER", "PROJECT_MEMBER"), "create tasks");

        // Validate subtask depth if parent task is supplied
        if (request.getParentTaskId() != null) {
            Task parentTask = taskRepository.findById(request.getParentTaskId())
                    .orElseThrow(() -> new EntityNotFoundException("Parent task not found with ID: " + request.getParentTaskId()));
            if (!Objects.equals(parentTask.getProjectId(), request.getProjectId())) {
                throw new IllegalArgumentException("Parent task must belong to the same project");
            }
            if (parentTask.getDeletedAt() != null) {
                throw new IllegalArgumentException("Cannot assign deleted parent task");
            }
            if (calculateDepth(request.getParentTaskId()) > 3) {
                throw new IllegalArgumentException("Subtask depth cannot exceed 3 levels");
            }
        }

        // Auto-initialize default statuses for the project if none exist
        List<TaskStatus> projectStatuses = taskStatusRepository.findByProjectIdOrderBySortOrderAsc(request.getProjectId());
        if (projectStatuses.isEmpty()) {
            projectStatuses = createDefaultStatusesForProject(request.getProjectId());
        }

        // Resolve status ID
        UUID statusId = request.getStatusId();
        if (statusId == null) {
            statusId = projectStatuses.stream()
                    .filter(TaskStatus::isDefault)
                    .findFirst()
                    .map(TaskStatus::getId)
                    .orElse(projectStatuses.get(0).getId());
        } else {
            UUID finalStatusId = statusId;
            boolean statusExists = projectStatuses.stream().anyMatch(s -> s.getId().equals(finalStatusId));
            if (!statusExists) {
                throw new IllegalArgumentException("Invalid status ID for project: " + statusId);
            }
        }

        // Auto-initialize default custom statuses for the project if none exist
        List<CustomTaskStatus> customStatuses = customTaskStatusRepository.findByProjectIdOrderBySortOrderAsc(request.getProjectId());
        if (customStatuses.isEmpty()) {
            customStatuses = createDefaultCustomStatusesForProject(request.getProjectId(), orgId);
        }

        // Resolve custom status ID
        UUID currentStatusId = request.getCurrentStatusId();
        if (currentStatusId == null) {
            currentStatusId = customStatuses.stream()
                    .filter(CustomTaskStatus::isDefault)
                    .findFirst()
                    .map(CustomTaskStatus::getId)
                    .orElse(customStatuses.get(0).getId());
        }

        UUID taskId = UUID.randomUUID();
        Task task = Task.builder()
                .id(taskId)
                .projectId(request.getProjectId())
                .statusId(statusId)
                .currentStatusId(currentStatusId)
                .taskType(request.getTaskType() != null ? request.getTaskType() : "TASK")
                .departmentId(request.getDepartmentId())
                .teamId(request.getTeamId())
                .title(request.getTitle())
                .description(request.getDescription())
                .priority(request.getPriority() != null ? request.getPriority() : "MEDIUM")
                .startDate(request.getStartDate())
                .dueDate(request.getDueDate())
                .storyPoints(request.getStoryPoints())
                .parentTaskId(request.getParentTaskId())
                .phaseId(request.getPhaseId())
                .organizationId(orgId)
                .createdBy(currentUserId)
                .build();

        Task savedTask = taskRepository.save(task);

        // Record Activity Log
        logActivity(taskId, currentUserId, "CREATE", "Task created", null, savedTask.getTitle());

        // Perform automatic routing
        if (taskRouterService != null) {
            try {
                taskRouterService.routeTask(savedTask, "TASK_CREATED");
            } catch (Exception e) {
                log.error("Failed to auto-route task: {}", e.getMessage());
            }
        }

        return mapToResponse(savedTask);
    }

    @Transactional
    public TaskResponse updateTask(UUID taskId, TaskRequest request) {
        UUID currentUserId = SecurityContextHelper.getCurrentUserId();
        Task task = getTaskEntity(taskId); // Verifies tenant and project membership access

        // Ensure user is not a VIEWER
        verifyRoleRequirement(task.getProjectId(), List.of("PROJECT_OWNER", "PROJECT_MANAGER", "PROJECT_MEMBER"), "update tasks");

        // Validate parent task if it is changed
        if (request.getParentTaskId() != null && !Objects.equals(task.getParentTaskId(), request.getParentTaskId())) {
            if (taskId.equals(request.getParentTaskId())) {
                throw new IllegalArgumentException("Task cannot be its own parent");
            }
            Task parentTask = taskRepository.findById(request.getParentTaskId())
                    .orElseThrow(() -> new EntityNotFoundException("Parent task not found with ID: " + request.getParentTaskId()));
            if (!Objects.equals(parentTask.getProjectId(), task.getProjectId())) {
                throw new IllegalArgumentException("Parent task must belong to the same project");
            }
            if (calculateDepth(request.getParentTaskId()) > 3) {
                throw new IllegalArgumentException("Subtask depth cannot exceed 3 levels");
            }
        }

        // Validate status ID if updated
        if (request.getStatusId() != null && !Objects.equals(task.getStatusId(), request.getStatusId())) {
            TaskStatus status = taskStatusRepository.findById(request.getStatusId())
                    .orElseThrow(() -> new EntityNotFoundException("Status not found: " + request.getStatusId()));
            if (!Objects.equals(status.getProjectId(), task.getProjectId())) {
                throw new IllegalArgumentException("Status does not belong to this project");
            }
            logActivity(taskId, currentUserId, "STATUS_CHANGE", "Status updated", task.getStatusId().toString(), request.getStatusId().toString());
            task.setStatusId(request.getStatusId());
        }

        // Validate custom status ID if updated
        if (request.getCurrentStatusId() != null && !Objects.equals(task.getCurrentStatusId(), request.getCurrentStatusId())) {
            if (statusWorkflowService != null) {
                statusWorkflowService.transitionStatus(taskId, request.getCurrentStatusId(), currentUserId, "Task updated via REST API");
            } else {
                task.setCurrentStatusId(request.getCurrentStatusId());
            }
        }

        // Map updates and check changes for audit logs
        if (!Objects.equals(task.getTitle(), request.getTitle())) {
            logActivity(taskId, currentUserId, "TITLE_CHANGE", "Title updated", task.getTitle(), request.getTitle());
            task.setTitle(request.getTitle());
        }
        if (!Objects.equals(task.getDescription(), request.getDescription())) {
            logActivity(taskId, currentUserId, "DESC_CHANGE", "Description updated", task.getDescription(), request.getDescription());
            task.setDescription(request.getDescription());
        }
        if (!Objects.equals(task.getPriority(), request.getPriority()) && request.getPriority() != null) {
            logActivity(taskId, currentUserId, "PRIORITY_CHANGE", "Priority updated", task.getPriority(), request.getPriority());
            task.setPriority(request.getPriority());
        }
        
        task.setStartDate(request.getStartDate());
        task.setDueDate(request.getDueDate());
        task.setStoryPoints(request.getStoryPoints());
        task.setParentTaskId(request.getParentTaskId());
        task.setPhaseId(request.getPhaseId());
        if (request.getTaskType() != null) {
            task.setTaskType(request.getTaskType());
        }
        if (request.getDepartmentId() != null) {
            task.setDepartmentId(request.getDepartmentId());
        }
        if (request.getTeamId() != null) {
            task.setTeamId(request.getTeamId());
        }

        Task updatedTask = taskRepository.save(task);
        return mapToResponse(updatedTask);
    }

    @Transactional
    public void deleteTask(UUID taskId) {
        UUID currentUserId = SecurityContextHelper.getCurrentUserId();
        Task task = getTaskEntity(taskId);

        // Ensure user has OWNER or MANAGER or MEMBER role
        verifyRoleRequirement(task.getProjectId(), List.of("PROJECT_OWNER", "PROJECT_MANAGER", "PROJECT_MEMBER"), "delete tasks");

        task.setDeletedAt(Instant.now());
        taskRepository.save(task);

        logActivity(taskId, currentUserId, "DELETE", "Task soft deleted", null, null);
    }

    @Transactional(readOnly = true)
    public TaskResponse getTask(UUID taskId) {
        return mapToResponse(getTaskEntity(taskId));
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> listTasks(UUID projectId) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            throw new TenantIsolationException("Unauthorized access request");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + projectId));
        if (!Objects.equals(project.getOrganizationId(), orgId)) {
            throw new TenantIsolationException("Unauthorized cross-tenant access request blocked");
        }

        // Verify user project access
        verifyProjectAccess(projectId);

        return taskRepository.findByProjectIdAndDeletedAtIsNull(projectId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TaskAssignment assignTask(UUID taskId, UUID userId, String role) {
        UUID currentUserId = SecurityContextHelper.getCurrentUserId();
        Task task = getTaskEntity(taskId);

        // Verify active user is not VIEWER
        verifyRoleRequirement(task.getProjectId(), List.of("PROJECT_OWNER", "PROJECT_MANAGER", "PROJECT_MEMBER"), "assign tasks");

        // Verify assignee is a member of the project
        projectMemberRepository.findByProjectIdAndUserId(task.getProjectId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Assignee must be a member of the project"));

        TaskAssignment assignment = TaskAssignment.builder()
                .id(UUID.randomUUID())
                .taskId(taskId)
                .userId(userId)
                .role(role != null ? role : "ASSIGNEE")
                .build();

        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        logActivity(taskId, currentUserId, "ASSIGNMENT_ADD", "User assigned to task", null, userId.toString());
        return saved;
    }

    @Transactional
    public void unassignTask(UUID taskId, UUID userId) {
        UUID currentUserId = SecurityContextHelper.getCurrentUserId();
        Task task = getTaskEntity(taskId);

        verifyRoleRequirement(task.getProjectId(), List.of("PROJECT_OWNER", "PROJECT_MANAGER", "PROJECT_MEMBER"), "unassign tasks");

        taskAssignmentRepository.deleteByTaskIdAndUserId(taskId, userId);
        logActivity(taskId, currentUserId, "ASSIGNMENT_REMOVE", "User unassigned from task", userId.toString(), null);
    }

    @Transactional
    public TaskDependency addDependency(UUID taskId, UUID predecessorId, String dependencyType) {
        UUID currentUserId = SecurityContextHelper.getCurrentUserId();
        Task task = getTaskEntity(taskId);
        Task predecessor = getTaskEntity(predecessorId);

        if (!Objects.equals(task.getProjectId(), predecessor.getProjectId())) {
            throw new IllegalArgumentException("Tasks must belong to the same project to declare dependencies");
        }

        verifyRoleRequirement(task.getProjectId(), List.of("PROJECT_OWNER", "PROJECT_MANAGER", "PROJECT_MEMBER"), "manage dependencies");

        if (taskDependencyRepository.existsByTaskIdAndPredecessorId(taskId, predecessorId)) {
            throw new IllegalArgumentException("Dependency already exists");
        }

        // Circular Dependency Detection
        if (isCircularDependency(taskId, predecessorId)) {
            throw new IllegalArgumentException("Circular dependency detected! Adding this dependency creates an cycle.");
        }

        TaskDependency dependency = TaskDependency.builder()
                .id(UUID.randomUUID())
                .taskId(taskId)
                .predecessorId(predecessorId)
                .dependencyType(dependencyType != null ? dependencyType : "FINISH_TO_START")
                .build();

        TaskDependency saved = taskDependencyRepository.save(dependency);
        logActivity(taskId, currentUserId, "DEPENDENCY_ADD", "Added predecessor dependency", null, predecessorId.toString());
        return saved;
    }

    @Transactional
    public void removeDependency(UUID taskId, UUID predecessorId) {
        Task task = getTaskEntity(taskId);
        verifyRoleRequirement(task.getProjectId(), List.of("PROJECT_OWNER", "PROJECT_MANAGER", "PROJECT_MEMBER"), "manage dependencies");

        List<TaskDependency> deps = taskDependencyRepository.findByTaskId(taskId);
        for (TaskDependency dep : deps) {
            if (dep.getPredecessorId().equals(predecessorId)) {
                taskDependencyRepository.delete(dep);
                logActivity(taskId, SecurityContextHelper.getCurrentUserId(), "DEPENDENCY_REMOVE", "Removed predecessor dependency", predecessorId.toString(), null);
                break;
            }
        }
    }

    @Transactional
    public Comment addComment(UUID taskId, String content) {
        UUID currentUserId = SecurityContextHelper.getCurrentUserId();
        Task task = getTaskEntity(taskId);

        verifyProjectAccess(task.getProjectId()); // All project members (even viewers) can comment

        Comment comment = Comment.builder()
                .id(UUID.randomUUID())
                .entityType("TASK")
                .entityId(taskId)
                .userId(currentUserId)
                .content(content)
                .build();

        Comment saved = commentRepository.save(comment);
        logActivity(taskId, currentUserId, "COMMENT_ADD", "Added comment to task", null, saved.getId().toString());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Comment> getComments(UUID taskId) {
        Task task = getTaskEntity(taskId);
        return commentRepository.findByEntityTypeAndEntityIdOrderByCreatedAtAsc("TASK", taskId);
    }

    @Transactional
    public CustomFieldValue setCustomFieldValue(UUID taskId, UUID customFieldId, String value) {
        UUID currentUserId = SecurityContextHelper.getCurrentUserId();
        Task task = getTaskEntity(taskId);

        verifyRoleRequirement(task.getProjectId(), List.of("PROJECT_OWNER", "PROJECT_MANAGER", "PROJECT_MEMBER"), "manage custom fields");

        CustomField field = customFieldRepository.findById(customFieldId)
                .orElseThrow(() -> new EntityNotFoundException("Custom field not found: " + customFieldId));
        if (!Objects.equals(field.getProjectId(), task.getProjectId())) {
            throw new IllegalArgumentException("Custom field does not belong to this project");
        }

        CustomFieldValue fieldValue = customFieldValueRepository.findByTaskIdAndCustomFieldId(taskId, customFieldId)
                .orElseGet(() -> CustomFieldValue.builder()
                        .id(UUID.randomUUID())
                        .taskId(taskId)
                        .customFieldId(customFieldId)
                        .build());

        String oldValue = fieldValue.getValue();
        fieldValue.setValue(value);
        CustomFieldValue saved = customFieldValueRepository.save(fieldValue);

        logActivity(taskId, currentUserId, "CUSTOM_FIELD_UPDATE", "Custom field " + field.getName() + " updated", oldValue, value);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<CustomField> listCustomFields(UUID projectId) {
        verifyProjectAccess(projectId);
        return customFieldRepository.findByProjectId(projectId);
    }

    @Transactional
    public CustomField createCustomField(UUID projectId, CustomFieldRequest request) {
        verifyRoleRequirement(projectId, List.of("PROJECT_OWNER", "PROJECT_MANAGER"), "create custom fields");

        CustomField field = CustomField.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .name(request.getName())
                .fieldType(request.getFieldType())
                .options(request.getOptions())
                .build();

        return customFieldRepository.save(field);
    }

    // --- Helper Methods ---

    private Task getTaskEntity(UUID taskId) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            throw new TenantIsolationException("Unauthorized access request");
        }

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Task not found with ID: " + taskId));
        
        if (task.getDeletedAt() != null) {
            throw new EntityNotFoundException("Task has been deleted");
        }

        if (!Objects.equals(task.getOrganizationId(), orgId)) {
            throw new TenantIsolationException("Unauthorized cross-tenant access request blocked");
        }

        verifyProjectAccess(task.getProjectId());
        return task;
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

    private int calculateDepth(UUID parentTaskId) {
        int depth = 1;
        UUID currentParentId = parentTaskId;
        while (currentParentId != null) {
            depth++;
            Task parent = taskRepository.findById(currentParentId)
                    .orElseThrow(() -> new EntityNotFoundException("Parent task not found: " + parentTaskId));
            currentParentId = parent.getParentTaskId();
            if (depth > 3) {
                break;
            }
        }
        return depth;
    }

    private boolean isCircularDependency(UUID taskId, UUID predecessorId) {
        if (taskId.equals(predecessorId)) {
            return true;
        }

        Set<UUID> visited = new HashSet<>();
        Queue<UUID> queue = new LinkedList<>();
        queue.add(predecessorId);
        visited.add(predecessorId);

        while (!queue.isEmpty()) {
            UUID current = queue.poll();
            List<TaskDependency> deps = taskDependencyRepository.findByTaskId(current);
            for (TaskDependency dep : deps) {
                UUID pred = dep.getPredecessorId();
                if (pred.equals(taskId)) {
                    return true;
                }
                if (!visited.contains(pred)) {
                    visited.add(pred);
                    queue.add(pred);
                }
            }
        }
        return false;
    }

    private List<CustomTaskStatus> createDefaultCustomStatusesForProject(UUID projectId, UUID orgId) {
        List<String> defaultNames = List.of("Backlog", "To Do", "In Progress", "In Review", "Done");
        List<String> defaultCategories = List.of("PLANNING", "PLANNING", "ACTIVE", "ACTIVE", "COMPLETED");
        List<String> defaultColors = List.of("#6B7280", "#9CA3AF", "#3B82F6", "#F59E0B", "#10B981");
        List<CustomTaskStatus> statuses = new ArrayList<>();
        for (int i = 0; i < defaultNames.size(); i++) {
            CustomTaskStatus status = CustomTaskStatus.builder()
                    .id(UUID.randomUUID())
                    .projectId(projectId)
                    .organizationId(orgId)
                    .name(defaultNames.get(i))
                    .color(defaultColors.get(i))
                    .category(defaultCategories.get(i))
                    .sortOrder(i)
                    .isDefault(i == 1) // To Do is default
                    .build();
            statuses.add(customTaskStatusRepository.save(status));
        }
        return statuses;
    }

    private List<TaskStatus> createDefaultStatusesForProject(UUID projectId) {
        List<String> defaultNames = List.of("To Do", "In Progress", "In Review", "Done");
        List<String> defaultColors = List.of("#CCCCCC", "#3B82F6", "#F59E0B", "#10B981");
        List<TaskStatus> statuses = new ArrayList<>();
        for (int i = 0; i < defaultNames.size(); i++) {
            TaskStatus status = TaskStatus.builder()
                    .id(UUID.randomUUID())
                    .projectId(projectId)
                    .name(defaultNames.get(i))
                    .color(defaultColors.get(i))
                    .sortOrder(i)
                    .isDefault(i == 0)
                    .isCompleted(i == 3)
                    .build();
            statuses.add(taskStatusRepository.save(status));
        }
        return statuses;
    }

    private void logActivity(UUID taskId, UUID userId, String activityType, String description, String oldValue, String newValue) {
        TaskActivity activity = TaskActivity.builder()
                .id(UUID.randomUUID())
                .taskId(taskId)
                .userId(userId)
                .activityType(activityType)
                .description(description)
                .oldValue(oldValue)
                .newValue(newValue)
                .build();
        taskActivityRepository.save(activity);
    }

    private TaskResponse mapToResponse(Task task) {
        List<UUID> assigneeIds = taskAssignmentRepository.findByTaskId(task.getId()).stream()
                .map(TaskAssignment::getUserId)
                .collect(Collectors.toList());

        List<UUID> predecessorIds = taskDependencyRepository.findByTaskId(task.getId()).stream()
                .map(TaskDependency::getPredecessorId)
                .collect(Collectors.toList());

        return TaskResponse.builder()
                .id(task.getId())
                .projectId(task.getProjectId())
                .statusId(task.getStatusId())
                .currentStatusId(task.getCurrentStatusId())
                .taskType(task.getTaskType())
                .departmentId(task.getDepartmentId())
                .teamId(task.getTeamId())
                .escalatedAt(task.getEscalatedAt())
                .escalationCount(task.getEscalationCount())
                .title(task.getTitle())
                .description(task.getDescription())
                .priority(task.getPriority())
                .startDate(task.getStartDate())
                .dueDate(task.getDueDate())
                .storyPoints(task.getStoryPoints())
                .parentTaskId(task.getParentTaskId())
                .phaseId(task.getPhaseId())
                .organizationId(task.getOrganizationId())
                .version(task.getVersion())
                .createdBy(task.getCreatedBy())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .assigneeIds(assigneeIds)
                .predecessorIds(predecessorIds)
                .build();
    }
}
