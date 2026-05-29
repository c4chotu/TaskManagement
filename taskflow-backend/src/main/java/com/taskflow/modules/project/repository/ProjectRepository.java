package com.taskflow.modules.project.repository;

import com.taskflow.modules.project.domain.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findByOrganizationId(UUID organizationId);

    @Query("SELECT p FROM Project p WHERE p.organizationId = :orgId AND p.id IN " +
           "(SELECT pm.projectId FROM ProjectMember pm WHERE pm.userId = :userId)")
    List<Project> findMyProjects(@Param("orgId") UUID orgId, @Param("userId") UUID userId);
}
