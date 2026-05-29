package com.taskflow.modules.task.repository;

import com.taskflow.modules.task.domain.TaskAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskAssignmentRepository extends JpaRepository<TaskAssignment, UUID> {
    List<TaskAssignment> findByTaskId(UUID taskId);
    List<TaskAssignment> findByUserId(UUID userId);
    void deleteByTaskId(UUID taskId);
    void deleteByTaskIdAndUserId(UUID taskId, UUID userId);

    @Query("SELECT a.userId, COUNT(a) FROM TaskAssignment a " +
           "JOIN Task t ON t.id = a.taskId " +
           "WHERE t.projectId = :projectId AND t.deletedAt IS NULL " +
           "GROUP BY a.userId")
    List<Object[]> countTasksPerUserForProject(@Param("projectId") UUID projectId);
}

