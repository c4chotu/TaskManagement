package com.taskflow.modules.task.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "task_dependencies", schema = "tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskDependency {

    @Id
    private UUID id;

    @Column(name = "task_id", nullable = false)
    private UUID taskId;

    @Column(name = "predecessor_id", nullable = false)
    private UUID predecessorId;

    @Column(name = "dependency_type", nullable = false)
    @Builder.Default
    private String dependencyType = "FINISH_TO_START";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
