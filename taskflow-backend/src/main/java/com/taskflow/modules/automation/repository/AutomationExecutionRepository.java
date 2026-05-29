package com.taskflow.modules.automation.repository;

import com.taskflow.modules.automation.domain.AutomationExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AutomationExecutionRepository extends JpaRepository<AutomationExecution, UUID> {
    List<AutomationExecution> findByRuleIdOrderByExecutedAtDesc(UUID ruleId);
    List<AutomationExecution> findByStatus(String status);
}
