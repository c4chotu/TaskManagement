package com.taskflow.modules.automation.repository;

import com.taskflow.modules.automation.domain.AutomationRuleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AutomationRuleTypeRepository extends JpaRepository<AutomationRuleType, UUID> {
    List<AutomationRuleType> findByCategory(String category);
    boolean existsByCode(String code);
}
