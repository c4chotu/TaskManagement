package com.taskflow.modules.task.repository;

import com.taskflow.modules.task.domain.IssueDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IssueDetailRepository extends JpaRepository<IssueDetail, UUID> {
    Optional<IssueDetail> findByTaskId(UUID taskId);

    @Query("SELECT d FROM IssueDetail d WHERE d.taskId IN (SELECT t.id FROM Task t WHERE t.organizationId = :orgId)")
    List<IssueDetail> findByOrganizationId(@Param("orgId") UUID orgId);
}
