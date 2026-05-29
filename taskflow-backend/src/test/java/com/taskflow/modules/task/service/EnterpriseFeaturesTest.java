package com.taskflow.modules.task.service;

import com.taskflow.modules.auth.domain.User;
import com.taskflow.modules.auth.domain.UserRole;
import com.taskflow.modules.auth.repository.UserRepository;
import com.taskflow.modules.auth.repository.UserRoleRepository;
import com.taskflow.modules.auth.service.RoleHierarchyService;
import com.taskflow.modules.task.domain.*;
import com.taskflow.modules.task.repository.CustomTaskStatusRepository;
import com.taskflow.modules.task.repository.TaskDependencyRepository;
import com.taskflow.modules.task.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EnterpriseFeaturesTest {

    @Mock private UserRoleRepository userRoleRepository;
    @Mock private UserRepository userRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private CustomTaskStatusRepository customTaskStatusRepository;
    @Mock private TaskDependencyRepository taskDependencyRepository;

    @InjectMocks private RoleHierarchyService roleHierarchyService;
    @InjectMocks private StatusWorkflowService statusWorkflowService;

    @Test
    public void testRoleHierarchy_adminCannotManageOwner() {
        UUID adminId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();

        User admin = User.builder().id(adminId).organizationId(orgId).role("ORG_ADMIN").build();
        User owner = User.builder().id(ownerId).organizationId(orgId).role("ORG_OWNER").build();

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(owner));
        when(userRoleRepository.findByUserIdAndOrganizationId(adminId, orgId)).thenReturn(Collections.emptyList());
        when(userRoleRepository.findByUserIdAndOrganizationId(ownerId, orgId)).thenReturn(Collections.emptyList());

        // Act & Assert
        assertFalse(roleHierarchyService.canManageUser(adminId, ownerId));
    }

    @Test
    public void testRoleHierarchy_ownerCanManageAdmin() {
        UUID adminId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();

        User admin = User.builder().id(adminId).organizationId(orgId).role("ORG_ADMIN").build();
        User owner = User.builder().id(ownerId).organizationId(orgId).role("ORG_OWNER").build();

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(owner));
        when(userRoleRepository.findByUserIdAndOrganizationId(adminId, orgId)).thenReturn(Collections.emptyList());
        when(userRoleRepository.findByUserIdAndOrganizationId(ownerId, orgId)).thenReturn(Collections.emptyList());

        // Act & Assert
        assertTrue(roleHierarchyService.canManageUser(ownerId, adminId));
    }

    @Test
    public void testTransitionValidation_blocksIfSubtasksOpen() {
        UUID taskId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID subtaskId = UUID.randomUUID();
        UUID openStatusId = UUID.randomUUID();

        Task parentTask = Task.builder().id(taskId).projectId(projectId).build();
        CustomTaskStatus completedStatus = CustomTaskStatus.builder().id(UUID.randomUUID()).category("COMPLETED").name("Done").build();
        CustomTaskStatus openStatus = CustomTaskStatus.builder().id(openStatusId).category("ACTIVE").name("In Progress").build();

        Task subtask = Task.builder().id(subtaskId).projectId(projectId).parentTaskId(taskId).currentStatusId(openStatusId).build();

        when(taskRepository.findByProjectIdAndDeletedAtIsNull(projectId)).thenReturn(List.of(subtask));
        when(customTaskStatusRepository.findById(openStatusId)).thenReturn(Optional.of(openStatus));

        // Act & Assert
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            statusWorkflowService.validateTransition(parentTask, null, completedStatus, UUID.randomUUID(), "Complete");
        });
        assertTrue(ex.getMessage().contains("subtask"));
    }
}
