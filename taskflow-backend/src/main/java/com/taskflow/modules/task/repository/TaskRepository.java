package com.taskflow.modules.task.repository;

import com.taskflow.modules.task.domain.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findByProjectIdAndDeletedAtIsNull(UUID projectId);
    
    List<Task> findByOrganizationIdAndDeletedAtIsNull(UUID organizationId);
    
    List<Task> findByParentTaskIdAndDeletedAtIsNull(UUID parentTaskId);

    @Query("SELECT t FROM Task t WHERE t.organizationId = :orgId AND t.deletedAt IS NULL AND t.projectId IN " +
           "(SELECT pm.projectId FROM ProjectMember pm WHERE pm.userId = :userId)")
    List<Task> findMyTasks(@Param("orgId") UUID orgId, @Param("userId") UUID userId);

    long countByProjectIdAndOrganizationId(UUID projectId, UUID organizationId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.projectId = :projectId AND t.organizationId = :orgId AND t.deletedAt IS NULL AND :deleted = false")
    long countByProjectIdAndOrganizationIdAndIsDeleted(
            @Param("projectId") UUID projectId,
            @Param("orgId") UUID orgId,
            @Param("deleted") boolean deleted);
}
