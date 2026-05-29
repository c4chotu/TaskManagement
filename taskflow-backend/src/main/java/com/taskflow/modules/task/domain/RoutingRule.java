package com.taskflow.modules.task.domain;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "routing_rules", schema = "tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoutingRule {

    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "rule_name", nullable = false)
    private String ruleName;

    @Column(name = "task_type", nullable = false)
    private String taskType;

    @Type(JsonBinaryType.class)
    @Column(name = "trigger_condition", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> triggerCondition;

    @Column(name = "source_department_id")
    private UUID sourceDepartmentId;

    @Column(name = "source_team_id")
    private UUID sourceTeamId;

    @Column(name = "target_department_id")
    private UUID targetDepartmentId;

    @Column(name = "target_team_id")
    private UUID targetTeamId;

    @Column(name = "assign_to_role")
    private String assignToRole;

    @Column(name = "assignment_strategy")
    private String assignmentStrategy; // ROUND_ROBIN, LEAST_BUSY, SKILL_MATCH, MANUAL

    @Column(name = "auto_create_subtasks")
    @Builder.Default
    private boolean autoCreateSubtasks = false;

    @Type(JsonBinaryType.class)
    @Column(name = "subtask_template", columnDefinition = "jsonb")
    private Map<String, Object> subtaskTemplate;

    @Builder.Default
    private int priority = 0;

    @Builder.Default
    private boolean enabled = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
