package com.taskflow.modules.automation.repository;

import com.taskflow.modules.automation.domain.AutomationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AutomationRuleRepository extends JpaRepository<AutomationRule, UUID> {
    List<AutomationRule> findByProjectIdAndIsActive(UUID projectId, boolean isActive);
    List<AutomationRule> findByOrganizationId(UUID organizationId);
    List<AutomationRule> findByProjectIdAndTriggerTypeAndIsActive(UUID projectId, String triggerType, boolean isActive);
}
