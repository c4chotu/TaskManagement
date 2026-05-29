package com.taskflow.modules.user.repository;

import com.taskflow.modules.user.domain.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, UUID> {
    List<Department> findByOrganizationId(UUID organizationId);
    List<Department> findByParentDepartmentId(UUID parentDepartmentId);
}
