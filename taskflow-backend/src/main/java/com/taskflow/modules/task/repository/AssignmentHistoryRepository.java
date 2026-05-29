package com.taskflow.modules.task.repository;

import com.taskflow.modules.task.domain.AssignmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AssignmentHistoryRepository extends JpaRepository<AssignmentHistory, UUID> {
    List<AssignmentHistory> findByTaskId(UUID taskId);
}
