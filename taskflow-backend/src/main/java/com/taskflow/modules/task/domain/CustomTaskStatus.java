package com.taskflow.modules.task.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "custom_task_statuses", schema = "tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomTaskStatus {

    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category; // PLANNING, ACTIVE, COMPLETED, BLOCKED

    @Column(nullable = false)
    private String color;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @Column(name = "is_default")
    @Builder.Default
    private boolean isDefault = false;

    @Column(name = "requires_comment")
    @Builder.Default
    private boolean requiresComment = false;

    @Column(name = "requires_approval")
    @Builder.Default
    private boolean requiresApproval = false;

    @Column(name = "auto_transition_days")
    private Integer autoTransitionDays;

    @Column(name = "transition_to_on_auto")
    private UUID transitionToOnAuto;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
