package com.taskflow.modules.task.repository;

import com.taskflow.modules.task.domain.RoutingRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RoutingRuleRepository extends JpaRepository<RoutingRule, UUID> {
    List<RoutingRule> findByOrganizationIdAndEnabledTrueOrderByPriorityDesc(UUID organizationId);
}
