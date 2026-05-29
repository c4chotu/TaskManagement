package com.taskflow.modules.auth.repository;

import com.taskflow.modules.auth.domain.AutoAssignmentRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AutoAssignmentRuleRepository extends JpaRepository<AutoAssignmentRule, UUID> {
    List<AutoAssignmentRule> findByOrganizationIdAndEnabledTrue(UUID organizationId);
}
