package com.taskflow.modules.automation.controller;

import com.taskflow.modules.automation.domain.AutomationExecution;
import com.taskflow.modules.automation.domain.AutomationRule;
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

    public AutomationController(AutomationService automationService) {
        this.automationService = automationService;
    }

    @PostMapping
    public ResponseEntity<AutomationRule> createRule(@RequestBody Map<String, Object> body) {
        UUID projectId = UUID.fromString((String) body.get("projectId"));
        String name = (String) body.get("name");
        String description = (String) body.get("description");
        String triggerType = (String) body.get("triggerType");

        @SuppressWarnings("unchecked")
        List<Map<String, String>> conditions = (List<Map<String, String>>) body.get("conditions");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> actions = (List<Map<String, Object>>) body.get("actions");

        return ResponseEntity.ok(automationService.createRule(projectId, name, description, triggerType, conditions, actions));
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
}
