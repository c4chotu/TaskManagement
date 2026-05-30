package com.taskflow.modules.task.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "recurring_tasks", schema = "tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecurringTask {
    @Id
    private UUID id;

    @Column(name = "template_task_id", nullable = false)
    private UUID templateTaskId;

    @Column(name = "cron_expression", nullable = false)
    private String cronExpression; // 'WEEKLY', 'MONTHLY' (Simplified for MVP)

    @Column(name = "last_run_at")
    private Instant lastRunAt;

    @Column(name = "next_run_at")
    private Instant nextRunAt;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
