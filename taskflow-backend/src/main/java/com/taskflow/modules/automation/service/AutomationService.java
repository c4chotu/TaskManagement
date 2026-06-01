package com.taskflow.modules.automation.service;

import com.taskflow.common.exception.EntityNotFoundException;
import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.automation.domain.*;
import com.taskflow.modules.automation.repository.AutomationExecutionRepository;
import com.taskflow.modules.automation.repository.AutomationRuleRepository;
import com.taskflow.modules.task.domain.Task;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Automation Engine Service.
 *
 * Trigger types supported:
 *   TASK_CREATED, TASK_STATUS_CHANGED, TASK_ASSIGNED, TASK_DUE_DATE_CHANGED
 *
 * Condition operators: EQUALS, NOT_EQUALS, CONTAINS, NOT_CONTAINS
 *
 * Action types: ASSIGN_USER, CHANGE_STATUS, SEND_NOTIFICATION, SET_DUE_DATE_OFFSET
 */
@Service
public class AutomationService {

    private final AutomationRuleRepository ruleRepository;
    private final AutomationExecutionRepository executionRepository;

    public AutomationService(AutomationRuleRepository ruleRepository,
                              AutomationExecutionRepository executionRepository) {
        this.ruleRepository = ruleRepository;
        this.executionRepository = executionRepository;
    }

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private com.taskflow.modules.task.service.TaskService taskService;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private com.taskflow.modules.task.service.StatusWorkflowService statusWorkflowService;

    // ---- Rule Management ----

    @Transactional
    public AutomationRule createRule(UUID projectId, String name, String description, String triggerType,
                                     List<Map<String, String>> conditionDefs,
                                     List<Map<String, Object>> actionDefs) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        UUID orgId = SecurityContextHelper.getCurrentOrgId();

        AutomationRule rule = AutomationRule.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .organizationId(orgId)
                .name(name)
                .description(description)
                .triggerType(triggerType)
                .createdBy(userId)
                .isActive(true)
                .conditions(new ArrayList<>())
                .actions(new ArrayList<>())
                .build();

        if (conditionDefs != null) {
            int pos = 0;
            for (Map<String, String> cd : conditionDefs) {
                AutomationCondition condition = AutomationCondition.builder()
                        .id(UUID.randomUUID())
                        .rule(rule)
                        .fieldName(cd.get("fieldName"))
                        .operator(cd.get("operator"))
                        .fieldValue(cd.get("fieldValue"))
                        .position(pos++)
                        .build();
                rule.getConditions().add(condition);
            }
        }

        if (actionDefs != null) {
            int pos = 0;
            for (Map<String, Object> ad : actionDefs) {
                @SuppressWarnings("unchecked")
                Map<String, Object> config = ad.get("actionConfig") instanceof Map
                        ? (Map<String, Object>) ad.get("actionConfig")
                        : new java.util.HashMap<>();
                AutomationAction action = AutomationAction.builder()
                        .id(UUID.randomUUID())
                        .rule(rule)
                        .actionType((String) ad.get("actionType"))
                        .actionConfig(config)
                        .position(pos++)
                        .build();
                rule.getActions().add(action);
            }
        }

        return ruleRepository.save(rule);
    }

    @Transactional(readOnly = true)
    public List<AutomationRule> listRulesForProject(UUID projectId) {
        return ruleRepository.findByProjectIdAndIsActive(projectId, true);
    }

    @Transactional(readOnly = true)
    public List<AutomationRule> listRulesForOrganization(UUID orgId) {
        return ruleRepository.findByOrganizationId(orgId);
    }

    @Transactional
    public AutomationRule toggleRule(UUID ruleId) {
        AutomationRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + ruleId));
        rule.setActive(!rule.isActive());
        return ruleRepository.save(rule);
    }

    @Transactional
    public void deleteRule(UUID ruleId) {
        AutomationRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + ruleId));
        ruleRepository.delete(rule);
    }

    // ---- Rule Evaluation Engine ----

    /**
     * Evaluate all active rules for a project against a triggered event.
     * Called internally by TaskService/NotificationService on relevant state changes.
     */
    @Transactional
    public void evaluateRules(String triggerType, UUID projectId, Task task, Map<String, Object> eventContext) {
        List<AutomationRule> rules = ruleRepository.findByProjectIdAndTriggerTypeAndIsActive(projectId, triggerType, true);

        for (AutomationRule rule : rules) {
            AutomationExecution execution = AutomationExecution.builder()
                    .id(UUID.randomUUID())
                    .ruleId(rule.getId())
                    .triggerEntityType("TASK")
                    .triggerEntityId(task.getId())
                    .status("PENDING")
                    .build();

            try {
                boolean allConditionsMet = rule.getConditions().isEmpty() ||
                        rule.getConditions().stream().allMatch(c -> evaluateCondition(c, eventContext));

                if (allConditionsMet) {
                    rule.getActions().forEach(action -> dispatchAction(action, task, eventContext));
                    execution.setStatus("SUCCESS");
                } else {
                    execution.setStatus("SKIPPED");
                }
            } catch (Exception e) {
                execution.setStatus("FAILED");
                execution.setErrorMessage(e.getMessage());
            }

            executionRepository.save(execution);
        }
    }

    @Transactional(readOnly = true)
    public List<AutomationExecution> getExecutionLog(UUID ruleId) {
        return executionRepository.findByRuleIdOrderByExecutedAtDesc(ruleId);
    }

    // ---- Private helpers ----

    private boolean evaluateCondition(AutomationCondition condition, Map<String, Object> context) {
        Object contextValue = context.get(condition.getFieldName());
        if (contextValue == null) return false;
        String strValue = contextValue.toString();
        String expected = condition.getFieldValue();

        return switch (condition.getOperator().toUpperCase()) {
            case "EQUALS" -> strValue.equalsIgnoreCase(expected);
            case "NOT_EQUALS" -> !strValue.equalsIgnoreCase(expected);
            case "CONTAINS" -> strValue.contains(expected);
            case "NOT_CONTAINS" -> !strValue.contains(expected);
            default -> false;
        };
    }

    private void dispatchAction(AutomationAction action, Task task, Map<String, Object> context) {
        // Execute a small set of supported action types synchronously.
        String type = action.getActionType() == null ? "" : action.getActionType().toUpperCase();
        Map<String, Object> cfg = action.getActionConfig() != null ? action.getActionConfig() : new java.util.HashMap<>();
        UUID actorId = null;
        try {
            if (action.getRule() != null) actorId = action.getRule().getCreatedBy();
        } catch (Exception ignored) {}

        switch (type) {
            case "ASSIGN_USER": {
                Object uid = cfg.getOrDefault("userId", context != null ? context.get("assigneeId") : null);
                String role = cfg.getOrDefault("role", "ASSIGNEE").toString();
                if (uid != null) {
                    UUID userId = UUID.fromString(uid.toString());
                    try {
                        taskService.assignTask(task.getId(), userId, role);
                    } catch (Exception e) {
                        throw new RuntimeException("Failed to assign user via automation: " + e.getMessage());
                    }
                }
                break;
            }
            case "CHANGE_STATUS": {
                Object sid = cfg.getOrDefault("statusId", cfg.get("targetStatusId"));
                if (sid != null) {
                    UUID statusId = UUID.fromString(sid.toString());
                    try {
                        UUID performer = actorId != null ? actorId : SecurityContextHelper.getCurrentUserId();
                        statusWorkflowService.transitionStatus(task.getId(), statusId, performer, "Automation rule: " + (action.getRule() != null ? action.getRule().getName() : "auto"));
                    } catch (Exception e) {
                        throw new RuntimeException("Failed to change status via automation: " + e.getMessage());
                    }
                }
                break;
            }
            case "SET_DUE_DATE_OFFSET": {
                Object offsetObj = cfg.getOrDefault("daysOffset", cfg.get("offsetDays"));
                if (offsetObj != null) {
                    int days = Integer.parseInt(offsetObj.toString());
                    java.time.Instant base = task.getDueDate() != null ? task.getDueDate() : java.time.Instant.now();
                    java.time.Instant newDue = base.plus(java.time.Duration.ofDays(days));
                    try {
                        com.taskflow.modules.task.dto.TaskRequest req = new com.taskflow.modules.task.dto.TaskRequest();
                        req.setProjectId(task.getProjectId());
                        req.setTitle(task.getTitle());
                        req.setDescription(task.getDescription());
                        req.setDueDate(newDue);
                        taskService.updateTask(task.getId(), req);
                    } catch (Exception e) {
                        throw new RuntimeException("Failed to set due date via automation: " + e.getMessage());
                    }
                }
                break;
            }
            case "SEND_NOTIFICATION": {
                // Placeholder: integrate notification service in future
                break;
            }
            default:
                throw new IllegalArgumentException("Unknown action type: " + action.getActionType());
        }
    }
}
