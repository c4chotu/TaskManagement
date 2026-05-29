package com.taskflow.modules.task.service;

import com.taskflow.common.exception.UnauthorizedException;
import com.taskflow.common.security.AuthenticatedUser;
import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.project.domain.Project;
import com.taskflow.modules.project.domain.ProjectMember;
import com.taskflow.modules.project.repository.ProjectMemberRepository;
import com.taskflow.modules.project.repository.ProjectRepository;
import com.taskflow.modules.task.domain.*;
import com.taskflow.modules.task.dto.TaskRequest;
import com.taskflow.modules.task.dto.TaskResponse;
import com.taskflow.modules.task.repository.*;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TaskServiceTest {

    @Mock private TaskRepository taskRepository;
    @Mock private TaskStatusRepository taskStatusRepository;
    @Mock private TaskAssignmentRepository taskAssignmentRepository;
    @Mock private TaskDependencyRepository taskDependencyRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private CustomFieldRepository customFieldRepository;
    @Mock private CustomFieldValueRepository customFieldValueRepository;
    @Mock private TaskActivityRepository taskActivityRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository projectMemberRepository;
    @Mock private CustomTaskStatusRepository customTaskStatusRepository;

    @InjectMocks
    private TaskService taskService;

    private MockedStatic<SecurityContextHelper> mockedSecurityHelper;

    private UUID userId;
    private UUID orgId;
    private UUID projectId;
    private UUID statusId;
    private Project project;
    private TaskStatus status;
    private AuthenticatedUser currentUser;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        orgId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        statusId = UUID.randomUUID();

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

        status = TaskStatus.builder()
                .id(statusId)
                .projectId(projectId)
                .name("To Do")
                .color("#CCCCCC")
                .isDefault(true)
                .build();

        mockedSecurityHelper = Mockito.mockStatic(SecurityContextHelper.class);
        mockedSecurityHelper.when(SecurityContextHelper::getCurrentUserId).thenReturn(userId);
        mockedSecurityHelper.when(SecurityContextHelper::getCurrentOrgId).thenReturn(orgId);
        mockedSecurityHelper.when(SecurityContextHelper::getCurrentUser).thenReturn(currentUser);

        CustomTaskStatus customStatus = CustomTaskStatus.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .organizationId(orgId)
                .name("To Do")
                .category("PLANNING")
                .color("#CCCCCC")
                .isDefault(true)
                .build();
        Mockito.lenient().when(customTaskStatusRepository.findByProjectIdOrderBySortOrderAsc(any(UUID.class)))
                .thenReturn(List.of(customStatus));
    }

    @AfterEach
    void tearDown() {
        mockedSecurityHelper.close();
    }

    @Test
    void createTask_asMember_shouldSucceed() {
        // Arrange
        TaskRequest request = new TaskRequest();
        request.setProjectId(projectId);
        request.setTitle("Fix Login Bug");
        request.setPriority("HIGH");

        ProjectMember member = ProjectMember.builder()
                .projectId(projectId)
                .userId(userId)
                .role("PROJECT_MEMBER")
                .build();

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId(projectId, userId)).thenReturn(Optional.of(member));
        when(taskStatusRepository.findByProjectIdOrderBySortOrderAsc(projectId)).thenReturn(List.of(status));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        TaskResponse response = taskService.createTask(request);

        // Assert
        assertNotNull(response);
        assertEquals("Fix Login Bug", response.getTitle());
        assertEquals("HIGH", response.getPriority());
        assertEquals(statusId, response.getStatusId());
        verify(taskRepository, times(1)).save(any(Task.class));
        verify(taskActivityRepository, times(1)).save(any(TaskActivity.class));
    }

    @Test
    void createTask_asViewer_shouldThrowUnauthorizedException() {
        // Arrange
        TaskRequest request = new TaskRequest();
        request.setProjectId(projectId);
        request.setTitle("Fix Login Bug");

        ProjectMember viewer = ProjectMember.builder()
                .projectId(projectId)
                .userId(userId)
                .role("VIEWER")
                .build();

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId(projectId, userId)).thenReturn(Optional.of(viewer));

        // Act & Assert
        assertThrows(UnauthorizedException.class, () -> taskService.createTask(request));
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void createTask_exceedingDepthLimit_shouldThrowIllegalArgumentException() {
        // Arrange
        UUID parentId = UUID.randomUUID();
        UUID grandparentId = UUID.randomUUID();
        UUID greatGrandparentId = UUID.randomUUID();

        TaskRequest request = new TaskRequest();
        request.setProjectId(projectId);
        request.setTitle("Sub-sub-sub task");
        request.setParentTaskId(parentId);

        ProjectMember member = ProjectMember.builder()
                .projectId(projectId)
                .userId(userId)
                .role("PROJECT_MEMBER")
                .build();

        Task parent = Task.builder().id(parentId).projectId(projectId).parentTaskId(grandparentId).organizationId(orgId).build();
        Task grandparent = Task.builder().id(grandparentId).projectId(projectId).parentTaskId(greatGrandparentId).organizationId(orgId).build();
        Task greatGrandparent = Task.builder().id(greatGrandparentId).projectId(projectId).parentTaskId(null).organizationId(orgId).build();

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId(projectId, userId)).thenReturn(Optional.of(member));
        when(taskRepository.findById(parentId)).thenReturn(Optional.of(parent));
        when(taskRepository.findById(grandparentId)).thenReturn(Optional.of(grandparent));
        when(taskRepository.findById(greatGrandparentId)).thenReturn(Optional.of(greatGrandparent));

        // Act & Assert
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> taskService.createTask(request));
        assertEquals("Subtask depth cannot exceed 3 levels", ex.getMessage());
    }

    @Test
    void addDependency_circular_shouldThrowIllegalArgumentException() {
        // Arrange
        UUID taskAId = UUID.randomUUID();
        UUID taskBId = UUID.randomUUID();

        Task taskA = Task.builder().id(taskAId).projectId(projectId).organizationId(orgId).statusId(statusId).build();
        Task taskB = Task.builder().id(taskBId).projectId(projectId).organizationId(orgId).statusId(statusId).build();

        ProjectMember member = ProjectMember.builder()
                .projectId(projectId)
                .userId(userId)
                .role("PROJECT_MEMBER")
                .build();

        // Setup mock project membership verification
        when(taskRepository.findById(taskAId)).thenReturn(Optional.of(taskA));
        when(taskRepository.findById(taskBId)).thenReturn(Optional.of(taskB));
        when(projectMemberRepository.findByProjectIdAndUserId(projectId, userId)).thenReturn(Optional.of(member));

        // Setup dependency records to simulate Task B already depending on Task A
        TaskDependency existingDep = TaskDependency.builder()
                .taskId(taskBId)
                .predecessorId(taskAId)
                .build();
        when(taskDependencyRepository.findByTaskId(taskBId)).thenReturn(List.of(existingDep));

        // Act & Assert: try to add dependency Task A -> Task B (Task A depends on Task B)
        assertThrows(IllegalArgumentException.class, () -> taskService.addDependency(taskAId, taskBId, "FINISH_TO_START"));
    }

    @Test
    void deleteTask_shouldSoftDelete() {
        // Arrange
        UUID taskId = UUID.randomUUID();
        Task task = Task.builder()
                .id(taskId)
                .projectId(projectId)
                .organizationId(orgId)
                .title("Delete me")
                .statusId(statusId)
                .build();

        ProjectMember member = ProjectMember.builder()
                .projectId(projectId)
                .userId(userId)
                .role("PROJECT_OWNER")
                .build();

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
        when(projectMemberRepository.findByProjectIdAndUserId(projectId, userId)).thenReturn(Optional.of(member));

        // Act
        taskService.deleteTask(taskId);

        // Assert
        assertNotNull(task.getDeletedAt());
        verify(taskRepository, times(1)).save(task);
        verify(taskActivityRepository, times(1)).save(any(TaskActivity.class));
    }
}
