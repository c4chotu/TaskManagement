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
@Table(name = "issue_escalations", schema = "tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssueEscalation {

    @Id
    private UUID id;

    @Column(name = "issue_id", nullable = false)
    private UUID issueId;

    @Column(name = "escalated_from_role")
    private String escalatedFromRole;

    @Column(name = "escalated_to_role")
    private String escalatedToRole;

    @Column(name = "escalated_by", nullable = false)
    private UUID escalatedBy;

    @CreationTimestamp
    @Column(name = "escalated_at", updatable = false)
    private Instant escalatedAt;

    private String reason;

    @Column(name = "resolved_at")
    private Instant resolvedAt;
}
