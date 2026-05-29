package com.taskflow.modules.task.repository;

import com.taskflow.modules.task.domain.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskStatusRepository extends JpaRepository<TaskStatus, UUID> {
    List<TaskStatus> findByProjectIdOrderBySortOrderAsc(UUID projectId);
}
