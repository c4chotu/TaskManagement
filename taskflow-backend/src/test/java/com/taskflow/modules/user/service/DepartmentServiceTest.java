package com.taskflow.modules.user.service;

import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.user.domain.Department;
import com.taskflow.modules.user.repository.DepartmentRepository;
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
public class DepartmentServiceTest {

    @Mock
    private DepartmentRepository departmentRepository;

    @InjectMocks
    private DepartmentService departmentService;

    private MockedStatic<SecurityContextHelper> mockedSecurityHelper;

    private UUID orgId;
    private UUID deptId;
    private Department department;

    @BeforeEach
    void setUp() {
        orgId = UUID.randomUUID();
        deptId = UUID.randomUUID();

        department = Department.builder()
                .id(deptId)
                .name("Product Engineering")
                .description("Build awesome products")
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
    void listDepartments_shouldSucceed() {
        when(departmentRepository.findByOrganizationId(orgId)).thenReturn(List.of(department));

        List<Department> results = departmentService.listDepartments();

        assertEquals(1, results.size());
        assertEquals("Product Engineering", results.get(0).getName());
    }

    @Test
    void createDepartment_shouldSucceed() {
        UUID headUserId = UUID.randomUUID();
        UUID parentId = UUID.randomUUID();
        when(departmentRepository.save(any(Department.class))).thenReturn(department);

        Department created = departmentService.createDepartment("Product Engineering", "Build awesome products", headUserId, parentId);

        assertNotNull(created);
        verify(departmentRepository, times(1)).save(argThat(d ->
                "Product Engineering".equals(d.getName()) &&
                "Build awesome products".equals(d.getDescription()) &&
                headUserId.equals(d.getHeadUserId()) &&
                parentId.equals(d.getParentDepartmentId()) &&
                orgId.equals(d.getOrganizationId())
        ));
    }

    @Test
    void updateDepartmentHead_shouldSucceed() {
        UUID newHeadUserId = UUID.randomUUID();
        when(departmentRepository.findById(deptId)).thenReturn(Optional.of(department));
        when(departmentRepository.save(any(Department.class))).thenReturn(department);

        Department updated = departmentService.updateDepartmentHead(deptId, newHeadUserId);

        assertNotNull(updated);
        verify(departmentRepository, times(1)).save(argThat(d ->
                d.getId().equals(deptId) &&
                newHeadUserId.equals(d.getHeadUserId())
        ));
    }
}
