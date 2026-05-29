package com.taskflow.modules.task.repository;

import com.taskflow.modules.task.domain.IssueDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface IssueDetailRepository extends JpaRepository<IssueDetail, UUID> {
    Optional<IssueDetail> findByTaskId(UUID taskId);
}
