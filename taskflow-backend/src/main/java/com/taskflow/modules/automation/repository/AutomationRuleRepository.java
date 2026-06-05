package com.taskflow.modules.automation.repository;

import com.taskflow.modules.automation.domain.AutomationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AutomationRuleRepository extends JpaRepository<AutomationRule, UUID> {
    List<AutomationRule> findByProjectIdAndEnabled(UUID projectId, boolean enabled);
    List<AutomationRule> findByOrganizationId(UUID organizationId);
    List<AutomationRule> findByProjectIdAndTriggerTypeAndEnabled(UUID projectId, String triggerType, boolean enabled);

    @Query("SELECT r FROM AutomationRule r WHERE r.organizationId = :orgId AND LOWER(r.triggerType) = LOWER(:triggerType) AND r.enabled = :enabled AND " +
           "(r.projectId = :projectId OR (r.projectId IS NULL AND r.teamId IS NULL) OR (r.projectId IS NULL AND :teamId IS NOT NULL AND r.teamId = :teamId))")
    List<AutomationRule> findActiveRulesByScope(@Param("orgId") UUID orgId, 
                                                @Param("projectId") UUID projectId, 
                                                @Param("teamId") UUID teamId, 
                                                @Param("triggerType") String triggerType, 
                                                @Param("enabled") boolean enabled);
}
