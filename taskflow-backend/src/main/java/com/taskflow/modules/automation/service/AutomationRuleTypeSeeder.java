package com.taskflow.modules.automation.service;

import com.taskflow.modules.automation.domain.AutomationRuleType;
import com.taskflow.modules.automation.repository.AutomationRuleTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@Order(50)
@RequiredArgsConstructor
public class AutomationRuleTypeSeeder implements ApplicationRunner {

    private final AutomationRuleTypeRepository repository;

    private static final List<AutomationRuleType> TYPES = List.of(
        // ── TASK triggers ────────────────────────────────────────────────
        AutomationRuleType.builder().id(UUID.fromString("10000000-0000-0000-0000-000000000001"))
            .code("TASK_CREATED").name("Task Created")
            .description("Fires when a new task is created in the project")
            .category("TASK").triggerType("TASK_CREATED").defaultActionType("ASSIGN_USER").build(),

        AutomationRuleType.builder().id(UUID.fromString("10000000-0000-0000-0000-000000000002"))
            .code("TASK_UPDATED").name("Task Updated")
            .description("Fires when any field on a task is changed")
            .category("TASK").triggerType("TASK_UPDATED").defaultActionType("SEND_NOTIFICATION").build(),

        AutomationRuleType.builder().id(UUID.fromString("10000000-0000-0000-0000-000000000003"))
            .code("TASK_STATUS_CHANGED").name("Task Status Changed")
            .description("Fires when a task moves from one status to another")
            .category("TASK").triggerType("TASK_STATUS_CHANGED").defaultActionType("SEND_NOTIFICATION").build(),

        AutomationRuleType.builder().id(UUID.fromString("10000000-0000-0000-0000-000000000004"))
            .code("TASK_ASSIGNED").name("Task Assigned")
            .description("Fires when a task is assigned to a user")
            .category("TASK").triggerType("TASK_ASSIGNED").defaultActionType("SEND_NOTIFICATION").build(),

        AutomationRuleType.builder().id(UUID.fromString("10000000-0000-0000-0000-000000000005"))
            .code("TASK_DUE_SOON").name("Task Due Soon")
            .description("Fires 24h before a task's due date")
            .category("TASK").triggerType("TASK_DUE_SOON").defaultActionType("SEND_NOTIFICATION").build(),

        AutomationRuleType.builder().id(UUID.fromString("10000000-0000-0000-0000-000000000006"))
            .code("TASK_OVERDUE").name("Task Overdue")
            .description("Fires when a task passes its due date without completion")
            .category("TASK").triggerType("TASK_OVERDUE").defaultActionType("ESCALATE").build(),

        AutomationRuleType.builder().id(UUID.fromString("10000000-0000-0000-0000-000000000007"))
            .code("TASK_PRIORITY_CHANGED").name("Task Priority Changed")
            .description("Fires when a task priority is escalated or de-escalated")
            .category("TASK").triggerType("TASK_PRIORITY_CHANGED").defaultActionType("SEND_NOTIFICATION").build(),

        AutomationRuleType.builder().id(UUID.fromString("10000000-0000-0000-0000-000000000008"))
            .code("TASK_COMPLETED").name("Task Completed")
            .description("Fires when a task status is set to a completed/done state")
            .category("TASK").triggerType("TASK_COMPLETED").defaultActionType("SEND_NOTIFICATION").build(),

        // ── ISSUE triggers ────────────────────────────────────────────────
        AutomationRuleType.builder().id(UUID.fromString("10000000-0000-0000-0000-000000000009"))
            .code("ISSUE_CREATED").name("Issue / Incident Created")
            .description("Fires when a new issue or incident is reported")
            .category("ISSUE").triggerType("ISSUE_CREATED").defaultActionType("ASSIGN_USER").build(),

        AutomationRuleType.builder().id(UUID.fromString("10000000-0000-0000-0000-00000000000a"))
            .code("SLA_BREACHED").name("SLA Breached")
            .description("Fires when an incident breaches its SLA threshold")
            .category("ISSUE").triggerType("SLA_BREACHED").defaultActionType("ESCALATE").build(),

        // ── SPRINT triggers ────────────────────────────────────────────────
        AutomationRuleType.builder().id(UUID.fromString("10000000-0000-0000-0000-00000000000b"))
            .code("SPRINT_STARTED").name("Sprint / Phase Started")
            .description("Fires when a sprint or phase is activated")
            .category("SPRINT").triggerType("SPRINT_STARTED").defaultActionType("SEND_NOTIFICATION").build(),

        AutomationRuleType.builder().id(UUID.fromString("10000000-0000-0000-0000-00000000000c"))
            .code("SPRINT_COMPLETED").name("Sprint / Phase Completed")
            .description("Fires when a sprint or phase is marked complete")
            .category("SPRINT").triggerType("SPRINT_COMPLETED").defaultActionType("SEND_NOTIFICATION").build(),

        // ── PROJECT triggers ────────────────────────────────────────────────
        AutomationRuleType.builder().id(UUID.fromString("10000000-0000-0000-0000-00000000000d"))
            .code("PROJECT_MEMBER_ADDED").name("Member Added to Project")
            .description("Fires when a user is added as a project member")
            .category("PROJECT").triggerType("PROJECT_MEMBER_ADDED").defaultActionType("SEND_NOTIFICATION").build(),

        // ── COMMENT triggers ────────────────────────────────────────────────
        AutomationRuleType.builder().id(UUID.fromString("10000000-0000-0000-0000-00000000000e"))
            .code("COMMENT_ADDED").name("Comment Added")
            .description("Fires when a comment is added to a task")
            .category("TASK").triggerType("COMMENT_ADDED").defaultActionType("SEND_NOTIFICATION").build()
    );

    @Override
    public void run(ApplicationArguments args) {
        for (AutomationRuleType type : TYPES) {
            if (!repository.existsByCode(type.getCode())) {
                repository.save(type);
            }
        }
    }
}
