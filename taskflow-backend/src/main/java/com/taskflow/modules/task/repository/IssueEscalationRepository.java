package com.taskflow.modules.task.repository;

import com.taskflow.modules.task.domain.IssueEscalation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface IssueEscalationRepository extends JpaRepository<IssueEscalation, UUID> {
    List<IssueEscalation> findByIssueId(UUID issueId);
}
