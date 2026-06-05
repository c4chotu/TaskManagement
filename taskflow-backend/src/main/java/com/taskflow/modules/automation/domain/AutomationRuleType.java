package com.taskflow.modules.automation.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "automation_rule_types", schema = "automations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AutomationRuleType {
    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String code; // e.g. TASK_CREATED

    @Column(nullable = false)
    private String name; // e.g. "Task Created"

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 50)
    private String category; // e.g. "TASK", "PROJECT", "SPRINT", "NOTIFICATION"

    @Column(name = "trigger_type", nullable = false, length = 100)
    private String triggerType; // The triggerType value to use

    @Column(name = "default_action_type", length = 100)
    private String defaultActionType; // Suggested default action e.g. "ASSIGN_USER"

    @Column(name = "is_system", nullable = false)
    @Builder.Default
    private boolean isSystem = true;
}
