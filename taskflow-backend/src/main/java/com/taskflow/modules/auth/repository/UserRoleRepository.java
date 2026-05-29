package com.taskflow.modules.auth.repository;

import com.taskflow.modules.auth.domain.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, UUID> {
    List<UserRole> findByUserIdAndOrganizationId(UUID userId, UUID organizationId);
    List<UserRole> findByDepartmentId(UUID departmentId);
    List<UserRole> findByTeamId(UUID teamId);
    List<UserRole> findByOrganizationIdAndRoleLevelLessThan(UUID organizationId, int roleLevel);
}
