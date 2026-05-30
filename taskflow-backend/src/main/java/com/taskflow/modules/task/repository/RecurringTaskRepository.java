package com.taskflow.modules.task.repository;

import com.taskflow.modules.task.domain.RecurringTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface RecurringTaskRepository extends JpaRepository<RecurringTask, UUID> {
    List<RecurringTask> findByIsActiveTrueAndNextRunAtLessThanEqual(Instant now);
}
