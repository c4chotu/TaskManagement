package com.taskflow.modules.automation.controller;

import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.automation.domain.AutomationExecution;
import com.taskflow.modules.automation.domain.AutomationRule;
import com.taskflow.modules.automation.domain.AutomationRuleType;
import com.taskflow.modules.automation.repository.AutomationRuleTypeRepository;
import com.taskflow.modules.automation.service.AutomationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/automations")
public class AutomationController {

    private final AutomationService automationService;
    private final AutomationRuleTypeRepository ruleTypeRepository;

    public AutomationController(AutomationService automationService,
                                AutomationRuleTypeRepository ruleTypeRepository) {
        this.automationService = automationService;
        this.ruleTypeRepository = ruleTypeRepository;
    }

    @GetMapping
    public ResponseEntity<List<AutomationRule>> listRules() {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(automationService.listRulesForOrganization(orgId));
    }

    @PostMapping
    public ResponseEntity<AutomationRule> createRule(@RequestBody Map<String, Object> body) {
        UUID projectId = parseUuidSafe((String) body.get("projectId"));
        UUID teamId = parseUuidSafe((String) body.get("teamId"));

        String name = (String) body.get("name");
        String description = (String) body.get("description");
        String triggerType = (String) body.get("triggerType");
        String ruleType = (String) body.getOrDefault("ruleType", "STANDARD");

        @SuppressWarnings("unchecked")
        List<Map<String, String>> conditions = (List<Map<String, String>>) body.get("conditions");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> actions = (List<Map<String, Object>>) body.get("actions");

        return ResponseEntity.ok(automationService.createRule(projectId, teamId, name, description, triggerType, ruleType, conditions, actions));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AutomationRule> updateRule(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        UUID projectId = parseUuidSafe((String) body.get("projectId"));
        UUID teamId = parseUuidSafe((String) body.get("teamId"));

        String name = (String) body.get("name");
        String description = (String) body.get("description");
        String triggerType = (String) body.get("triggerType");
        String ruleType = (String) body.getOrDefault("ruleType", "STANDARD");

        @SuppressWarnings("unchecked")
        List<Map<String, String>> conditions = (List<Map<String, String>>) body.get("conditions");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> actions = (List<Map<String, Object>>) body.get("actions");

        return ResponseEntity.ok(automationService.updateRule(id, projectId, teamId, name, description, triggerType, ruleType, conditions, actions));
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<AutomationRule>> listProjectRules(@PathVariable UUID projectId) {
        return ResponseEntity.ok(automationService.listRulesForProject(projectId));
    }

    @PostMapping("/{id}/toggle")
    public ResponseEntity<AutomationRule> toggleRule(@PathVariable UUID id) {
        return ResponseEntity.ok(automationService.toggleRule(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRule(@PathVariable UUID id) {
        automationService.deleteRule(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/executions")
    public ResponseEntity<List<AutomationExecution>> getExecutionLog(@PathVariable UUID id) {
        return ResponseEntity.ok(automationService.getExecutionLog(id));
    }

    @GetMapping("/rule-types")
    public ResponseEntity<List<AutomationRuleType>> listRuleTypes() {
        return ResponseEntity.ok(ruleTypeRepository.findAll());
    }

    private UUID parseUuidSafe(String str) {
        if (str == null) {
            return null;
        }
        String trimmed = str.trim();
        if (trimmed.isEmpty() || 
            "_global".equalsIgnoreCase(trimmed) || 
            "_none".equalsIgnoreCase(trimmed) || 
            "default".equalsIgnoreCase(trimmed) || 
            "undefined".equalsIgnoreCase(trimmed) || 
            "null".equalsIgnoreCase(trimmed)) {
            return null;
        }
        try {
            return UUID.fromString(trimmed);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
