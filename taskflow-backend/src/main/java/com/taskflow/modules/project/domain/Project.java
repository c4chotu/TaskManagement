package com.taskflow.modules.project.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "projects", schema = "projects")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Project {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    /** Short uppercase key used for task display IDs, e.g. "NETIQ" */
    @Column(name = "key", length = 10)
    private String key;

    /** Monotonically increasing counter; incremented atomically per task creation */
    @Column(name = "task_counter", nullable = false)
    @Builder.Default
    private int taskCounter = 0;

    private String description;

    @Column(nullable = false)
    private String status;

    private String type;

    @Column(name = "start_date")
    private Instant startDate;

    @Column(name = "end_date")
    private Instant endDate;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}

