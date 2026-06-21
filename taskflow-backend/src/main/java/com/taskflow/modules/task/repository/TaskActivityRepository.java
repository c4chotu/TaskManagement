package com.taskflow.modules.task.repository;

import com.taskflow.modules.task.domain.TaskActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskActivityRepository extends JpaRepository<TaskActivity, UUID> {
    List<TaskActivity> findByTaskIdOrderByCreatedAtDesc(UUID taskId);

    @org.springframework.data.jpa.repository.Query("SELECT ta FROM TaskActivity ta WHERE ta.taskId IN (SELECT t.id FROM Task t WHERE t.projectId = :projectId) ORDER BY ta.createdAt DESC")
    List<TaskActivity> findByProjectId(@org.springframework.data.repository.query.Param("projectId") UUID projectId);
}
