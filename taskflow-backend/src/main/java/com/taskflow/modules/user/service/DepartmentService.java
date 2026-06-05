package com.taskflow.modules.user.service;

import com.taskflow.common.exception.EntityNotFoundException;
import com.taskflow.common.exception.TenantIsolationException;
import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.user.domain.Department;
import com.taskflow.modules.user.repository.DepartmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    public DepartmentService(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    @Transactional(readOnly = true)
    public List<Department> listDepartments() {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) throw new TenantIsolationException("No organization context");
        return departmentRepository.findByOrganizationId(orgId);
    }

    @Transactional(readOnly = true)
    public Department getDepartment(UUID deptId) {
        Department dept = departmentRepository.findById(deptId)
                .orElseThrow(() -> new EntityNotFoundException("Department not found: " + deptId));
        verifyTenantAccess(dept.getOrganizationId());
        return dept;
    }

    @Transactional
    public Department createDepartment(String name, String description, UUID headUserId, UUID parentDepartmentId) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) throw new TenantIsolationException("No organization context");
        Department dept = Department.builder()
                .id(UUID.randomUUID())
                .organizationId(orgId)
                .name(name)
                .description(description)
                .headUserId(headUserId)
                .parentDepartmentId(parentDepartmentId)
                .build();
        return departmentRepository.save(dept);
    }

    @Transactional
    public Department updateDepartment(UUID deptId, String name, String description, UUID headUserId) {
        Department dept = getDepartment(deptId);
        if (name != null) dept.setName(name);
        if (description != null) dept.setDescription(description);
        if (headUserId != null) dept.setHeadUserId(headUserId);
        return departmentRepository.save(dept);
    }

    /**
     * Update only the department head (the user who leads this department).
     */
    @Transactional
    public Department updateDepartmentHead(UUID deptId, UUID headUserId) {
        Department dept = getDepartment(deptId);
        dept.setHeadUserId(headUserId);
        return departmentRepository.save(dept);
    }

    @Transactional
    public void deleteDepartment(UUID deptId) {
        Department dept = getDepartment(deptId);
        dept.setDeletedAt(java.time.Instant.now());
        departmentRepository.save(dept);
    }

    private void verifyTenantAccess(UUID orgId) {
        UUID currentOrgId = SecurityContextHelper.getCurrentOrgId();
        if (currentOrgId == null || !Objects.equals(currentOrgId, orgId)) {
            throw new TenantIsolationException("Unauthorized cross-tenant access request blocked");
        }
    }
}
