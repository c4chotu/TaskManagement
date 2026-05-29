package com.taskflow.modules.task.repository;

import com.taskflow.modules.task.domain.TaskDependency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskDependencyRepository extends JpaRepository<TaskDependency, UUID> {
    List<TaskDependency> findByTaskId(UUID taskId);
    List<TaskDependency> findByPredecessorId(UUID predecessorId);
    boolean existsByTaskIdAndPredecessorId(UUID taskId, UUID predecessorId);
    void deleteByTaskIdOrPredecessorId(UUID taskId, UUID predecessorId);
}
