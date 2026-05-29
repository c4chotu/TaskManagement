package com.taskflow.modules.task.repository;

import com.taskflow.modules.task.domain.CustomTaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomTaskStatusRepository extends JpaRepository<CustomTaskStatus, UUID> {
    List<CustomTaskStatus> findByProjectIdOrderBySortOrderAsc(UUID projectId);
    List<CustomTaskStatus> findByDepartmentIdOrderBySortOrderAsc(UUID departmentId);
    Optional<CustomTaskStatus> findByOrganizationIdAndProjectIdAndName(UUID organizationId, UUID projectId, String name);
}
