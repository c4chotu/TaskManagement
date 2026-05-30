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
@Table(name = "tasks", schema = "tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Task {

    @Id
    private UUID id;

    /** Sequential number within the project, e.g. 1, 2, 3... */
    @Column(name = "task_number")
    private Integer taskNumber;

    /** Human-readable display ID, e.g. NETIQ-T1 or NETIQ-I1 */
    @Column(name = "display_id", length = 25)
    private String displayId;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "status_id")
    private UUID statusId;

    @Column(name = "current_status_id")
    private UUID currentStatusId;

    @Column(name = "task_type", nullable = false)
    @Builder.Default
    private String taskType = "TASK";

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "team_id")
    private UUID teamId;

    @Column(name = "escalated_at")
    private java.time.Instant escalatedAt;

    @Column(name = "escalation_count")
    @Builder.Default
    private int escalationCount = 0;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(nullable = false)
    @Builder.Default
    private String priority = "MEDIUM";

    @Column(name = "start_date")
    private Instant startDate;

    @Column(name = "due_date")
    private Instant dueDate;

    @Column(name = "story_points")
    private Integer storyPoints;

    @Column(name = "parent_task_id")
    private UUID parentTaskId;

    @Column(name = "phase_id")
    private UUID phaseId;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Version
    @Column(nullable = false)
    private int version;

    @Column(name = "created_by")
    private UUID createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
