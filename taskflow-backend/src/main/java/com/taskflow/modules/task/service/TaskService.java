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
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
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
    private final RecurringTaskRepository recurringTaskRepository;
    private final IssueDetailRepository issueDetailRepository;

    private static final Logger log = LoggerFactory.getLogger(TaskService.class);

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private TaskRouterService taskRouterService;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private StatusWorkflowService statusWorkflowService;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private com.taskflow.modules.automation.service.AutomationService automationService;

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
                       ProjectMemberRepository projectMemberRepository,
                       RecurringTaskRepository recurringTaskRepository,
                       IssueDetailRepository issueDetailRepository) {
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
        this.recurringTaskRepository = recurringTaskRepository;
        this.issueDetailRepository = issueDetailRepository;
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

        // Auto-initialize default custom statuses for the project if none exist
        List<CustomTaskStatus> projectCustomStatuses = customTaskStatusRepository.findByProjectIdOrderBySortOrderAsc(request.getProjectId());
        if (projectCustomStatuses.isEmpty()) {
            projectCustomStatuses = createDefaultCustomStatusesForProject(request.getProjectId(), orgId);
        }
        List<CustomTaskStatus> customStatuses = new ArrayList<>(projectCustomStatuses);
        customStatuses.addAll(customTaskStatusRepository.findByOrganizationIdAndProjectIdIsNullOrderBySortOrderAsc(orgId));

        // Resolve custom status ID
        UUID currentStatusId = request.getCurrentStatusId();
        if (currentStatusId == null) {
            currentStatusId = customStatuses.stream()
                    .filter(CustomTaskStatus::isDefault)
                    .findFirst()
                    .map(CustomTaskStatus::getId)
                    .orElse(customStatuses.get(0).getId());
        }

        // Resolve standard status ID mapping from custom status category
        UUID statusId = resolveStandardStatusId(request.getProjectId(), currentStatusId);

        // ---- Atomically increment project task counter to get display number ----
        // Re-fetch project with a write lock to prevent concurrent duplicate numbers
        Project lockedProject = projectRepository.findByIdWithLock(request.getProjectId())
                .orElse(project);
        int newCounter = lockedProject.getTaskCounter() + 1;
        lockedProject.setTaskCounter(newCounter);
        projectRepository.save(lockedProject);

        String taskType = request.getTaskType() != null ? request.getTaskType() : "TASK";
        String projectKey = lockedProject.getKey() != null ? lockedProject.getKey()
                : lockedProject.getName().replaceAll("[^A-Z0-9]", "").toUpperCase();
        if (projectKey.isEmpty()) projectKey = "TASK";
        if (projectKey.length() > 8) projectKey = projectKey.substring(0, 8);
        String suffix = "ISSUE".equals(taskType) ? "-I" : "-T";
        String displayId = projectKey + suffix + newCounter;

        UUID taskId = UUID.randomUUID();
        Task task = Task.builder()
                .id(taskId)
                .taskNumber(newCounter)
                .displayId(displayId)
                .projectId(request.getProjectId())
                .statusId(statusId)
                .currentStatusId(currentStatusId)
                .taskType(taskType)
                .departmentId(request.getDepartmentId())
                .teamId(request.getTeamId())
                .title(request.getTitle())
                .description(request.getDescription())
                .priority(request.getPriority() != null ? request.getPriority() : "MEDIUM")
                .startDate(request.getStartDate())
                .dueDate(request.getDueDate())
                .category(request.getCategory())
                .badgeId(request.getBadgeId())
                .storyPoints(request.getStoryPoints())
                .parentTaskId(request.getParentTaskId())
                .phaseId(request.getPhaseId())
                .sprintId(request.getSprintId())
                .organizationId(orgId)
                .createdBy(currentUserId)
                .build();

        Task savedTask = taskRepository.save(task);

        // Process Task Assignments
        if (request.getAssigneeIds() != null) {
            for (UUID assigneeId : request.getAssigneeIds()) {
                projectMemberRepository.findByProjectIdAndUserId(savedTask.getProjectId(), assigneeId)
                        .orElseThrow(() -> new IllegalArgumentException("Assignee must be a member of the project: " + assigneeId));
                TaskAssignment assignment = TaskAssignment.builder()
                        .id(UUID.randomUUID())
                        .taskId(taskId)
                        .userId(assigneeId)
                        .role("ASSIGNEE")
                        .build();
                taskAssignmentRepository.save(assignment);
            }
        }

        // Record Activity Log
        logActivity(taskId, currentUserId, "CREATE", "Task created", null, displayId + ": " + savedTask.getTitle());

        // Perform automatic routing
        if (taskRouterService != null) {
            try {
                taskRouterService.routeTask(savedTask, "TASK_CREATED");
            } catch (Exception e) {
                log.error("Failed to auto-route task: {}", e.getMessage());
            }
        }

        // Handle recurring task logic
        if (request.getRecurrenceRule() != null && !request.getRecurrenceRule().isEmpty()) {
            Instant nextRun = "MONTHLY".equalsIgnoreCase(request.getRecurrenceRule()) 
                    ? Instant.now().plus(java.time.Duration.ofDays(30))
                    : Instant.now().plus(java.time.Duration.ofDays(7)); // Default WEEKLY
            
            RecurringTask recurring = RecurringTask.builder()
                    .id(UUID.randomUUID())
                    .templateTaskId(savedTask.getId())
                    .cronExpression(request.getRecurrenceRule().toUpperCase())
                    .nextRunAt(nextRun)
                    .isActive(true)
                    .build();
            recurringTaskRepository.save(recurring);
            logActivity(taskId, currentUserId, "RECURRENCE_SET", "Task set to recurring: " + request.getRecurrenceRule(), null, null);
        }

        // Trigger automation rules for TASK_CREATED
        try {
            java.util.Map<String, Object> ctx = new java.util.HashMap<>();
            ctx.put("triggeredBy", currentUserId != null ? currentUserId.toString() : null);
            ctx.put("priority", savedTask.getPriority());
            ctx.put("category", savedTask.getCategory());
            ctx.put("title", savedTask.getTitle());
            ctx.put("description", savedTask.getDescription());
            ctx.put("teamId", savedTask.getTeamId() != null ? savedTask.getTeamId().toString() : null);
            ctx.put("projectId", savedTask.getProjectId().toString());
            ctx.put("statusId", savedTask.getCurrentStatusId() != null ? savedTask.getCurrentStatusId().toString() : (savedTask.getStatusId() != null ? savedTask.getStatusId().toString() : null));
            ctx.put("taskType", savedTask.getTaskType());
            automationService.evaluateRules("TASK_CREATED", savedTask.getProjectId(), savedTask, ctx);
        } catch (Exception e) {
            log.error("Automation evaluation failed on create: {}", e.getMessage());
        }

        if ("ISSUE".equals(savedTask.getTaskType())) {
            Instant now = Instant.now();
            IssueDetail issueDetail = IssueDetail.builder()
                    .id(UUID.randomUUID())
                    .taskId(savedTask.getId())
                    .severity("SEV2")
                    .reportedBy(currentUserId)
                    .reportedAt(now)
                    .environment("PRODUCTION")
                    .responseDueAt(now.plus(java.time.Duration.ofHours(2)))
                    .fixDueAt(now.plus(java.time.Duration.ofHours(8)))
                    .customerReported(false)
                    .build();
            issueDetailRepository.save(issueDetail);
        }

        return mapToResponse(savedTask);
    }

    @Transactional
    public TaskResponse updateTask(UUID taskId, TaskRequest request) {
        UUID currentUserId = SecurityContextHelper.getCurrentUserId();
        Task task = getTaskEntity(taskId); // Verifies tenant and project membership access

        // Snapshot old values for automation triggers
        UUID oldCurrentStatusId = task.getCurrentStatusId();
        java.time.Instant oldDueDate = task.getDueDate();

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
                UUID resolvedStatusId = resolveStandardStatusId(task.getProjectId(), request.getCurrentStatusId());
                if (resolvedStatusId != null) {
                    task.setStatusId(resolvedStatusId);
                }
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
        if (!Objects.equals(task.getCategory(), request.getCategory())) {
            logActivity(taskId, currentUserId, "CATEGORY_CHANGE", "Category updated", task.getCategory(), request.getCategory());
            task.setCategory(request.getCategory());
        }
        if (!Objects.equals(task.getBadgeId(), request.getBadgeId())) {
            logActivity(taskId, currentUserId, "BADGE_CHANGE", "Badge updated", task.getBadgeId() != null ? task.getBadgeId().toString() : null, request.getBadgeId() != null ? request.getBadgeId().toString() : null);
            task.setBadgeId(request.getBadgeId());
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
        task.setSprintId(request.getSprintId());
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

        // Process Task Assignments if provided
        if (request.getAssigneeIds() != null) {
            taskAssignmentRepository.deleteByTaskId(taskId);
            for (UUID assigneeId : request.getAssigneeIds()) {
                projectMemberRepository.findByProjectIdAndUserId(task.getProjectId(), assigneeId)
                        .orElseThrow(() -> new IllegalArgumentException("Assignee must be a member of the project: " + assigneeId));
                TaskAssignment assignment = TaskAssignment.builder()
                        .id(UUID.randomUUID())
                        .taskId(taskId)
                        .userId(assigneeId)
                        .role("ASSIGNEE")
                        .build();
                taskAssignmentRepository.save(assignment);
            }
        }

        // Trigger automation for status changes and due date updates
        try {
            if (request.getCurrentStatusId() != null && !Objects.equals(oldCurrentStatusId, request.getCurrentStatusId())) {
                java.util.Map<String, Object> ctx = new java.util.HashMap<>();
                ctx.put("changedBy", currentUserId != null ? currentUserId.toString() : null);
                ctx.put("oldStatus", oldCurrentStatusId != null ? oldCurrentStatusId.toString() : null);
                ctx.put("newStatus", request.getCurrentStatusId().toString());
                ctx.put("priority", updatedTask.getPriority());
                ctx.put("category", updatedTask.getCategory());
                ctx.put("title", updatedTask.getTitle());
                ctx.put("description", updatedTask.getDescription());
                ctx.put("teamId", updatedTask.getTeamId() != null ? updatedTask.getTeamId().toString() : null);
                ctx.put("projectId", updatedTask.getProjectId().toString());
                ctx.put("statusId", updatedTask.getCurrentStatusId() != null ? updatedTask.getCurrentStatusId().toString() : (updatedTask.getStatusId() != null ? updatedTask.getStatusId().toString() : null));
                ctx.put("taskType", updatedTask.getTaskType());
                automationService.evaluateRules("TASK_STATUS_CHANGED", updatedTask.getProjectId(), updatedTask, ctx);
            }

            if (!Objects.equals(oldDueDate, request.getDueDate())) {
                java.util.Map<String, Object> ctx2 = new java.util.HashMap<>();
                ctx2.put("changedBy", currentUserId != null ? currentUserId.toString() : null);
                ctx2.put("oldDueDate", oldDueDate != null ? oldDueDate.toString() : null);
                ctx2.put("newDueDate", request.getDueDate() != null ? request.getDueDate().toString() : null);
                ctx2.put("priority", updatedTask.getPriority());
                ctx2.put("category", updatedTask.getCategory());
                ctx2.put("title", updatedTask.getTitle());
                ctx2.put("description", updatedTask.getDescription());
                ctx2.put("teamId", updatedTask.getTeamId() != null ? updatedTask.getTeamId().toString() : null);
                ctx2.put("projectId", updatedTask.getProjectId().toString());
                ctx2.put("statusId", updatedTask.getCurrentStatusId() != null ? updatedTask.getCurrentStatusId().toString() : (updatedTask.getStatusId() != null ? updatedTask.getStatusId().toString() : null));
                ctx2.put("taskType", updatedTask.getTaskType());
                automationService.evaluateRules("TASK_DUE_DATE_CHANGED", updatedTask.getProjectId(), updatedTask, ctx2);
            }
        } catch (Exception e) {
            log.error("Automation evaluation failed on update: {}", e.getMessage());
        }

        if ("ISSUE".equals(updatedTask.getTaskType())) {
            if (!issueDetailRepository.findByTaskId(updatedTask.getId()).isPresent()) {
                Instant now = Instant.now();
                IssueDetail issueDetail = IssueDetail.builder()
                        .id(UUID.randomUUID())
                        .taskId(updatedTask.getId())
                        .severity("SEV2")
                        .reportedBy(currentUserId != null ? currentUserId : updatedTask.getCreatedBy())
                        .reportedAt(now)
                        .environment("PRODUCTION")
                        .responseDueAt(now.plus(java.time.Duration.ofHours(2)))
                        .fixDueAt(now.plus(java.time.Duration.ofHours(8)))
                        .customerReported(false)
                        .build();
                issueDetailRepository.save(issueDetail);
            }
        }

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

        if (projectId != null) {
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
        } else {
            UUID currentUserId = SecurityContextHelper.getCurrentUserId();
            if (currentUserId == null) {
                throw new UnauthorizedException("Authenticated session context required");
            }
            return taskRepository.findMyTasks(orgId, currentUserId).stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }
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
        // Trigger automation for assignment
        try {
            java.util.Map<String, Object> ctx = new java.util.HashMap<>();
            ctx.put("assigneeId", userId.toString());
            ctx.put("assignedBy", currentUserId != null ? currentUserId.toString() : null);
            automationService.evaluateRules("TASK_ASSIGNED", task.getProjectId(), task, ctx);
        } catch (Exception e) {
            log.error("Automation evaluation failed on assign: {}", e.getMessage());
        }
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
                .displayId(task.getDisplayId())
                .taskNumber(task.getTaskNumber())
                .projectId(task.getProjectId())
                .statusId(task.getCurrentStatusId() != null ? task.getCurrentStatusId() : task.getStatusId())
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
                .category(task.getCategory())
                .badgeId(task.getBadgeId())
                .storyPoints(task.getStoryPoints())
                .parentTaskId(task.getParentTaskId())
                .phaseId(task.getPhaseId())
                .sprintId(task.getSprintId())
                .organizationId(task.getOrganizationId())
                .version(task.getVersion())
                .createdBy(task.getCreatedBy())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .assigneeIds(assigneeIds)
                .predecessorIds(predecessorIds)
                .build();
    }

    private UUID resolveStandardStatusId(UUID projectId, UUID customStatusId) {
        CustomTaskStatus customStatus = customTaskStatusRepository.findById(customStatusId).orElse(null);
        if (customStatus == null) return null;
        
        List<TaskStatus> projectStatuses = taskStatusRepository.findByProjectIdOrderBySortOrderAsc(projectId);
        if (projectStatuses.isEmpty()) {
            projectStatuses = createDefaultStatusesForProject(projectId);
        }
        
        String category = customStatus.getCategory();
        String targetStandardName = "To Do";
        if ("ACTIVE".equalsIgnoreCase(category)) {
            targetStandardName = "In Progress";
        } else if ("COMPLETED".equalsIgnoreCase(category)) {
            targetStandardName = "Done";
        }
        
        String finalTargetStandardName = targetStandardName;
        return projectStatuses.stream()
                .filter(s -> s.getName().equalsIgnoreCase(finalTargetStandardName))
                .findFirst()
                .map(TaskStatus::getId)
                .orElse(projectStatuses.get(0).getId());
    }
}
