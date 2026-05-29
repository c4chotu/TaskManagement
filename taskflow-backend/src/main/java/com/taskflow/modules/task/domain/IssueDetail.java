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
@Table(name = "issue_details", schema = "tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssueDetail {

    @Id
    private UUID id;

    @Column(name = "task_id", nullable = false, unique = true)
    private UUID taskId;

    @Column(nullable = false)
    private String severity; // SEV0, SEV1, SEV2, SEV3, SEV4

    @Column(name = "reported_by", nullable = false)
    private UUID reportedBy;

    @CreationTimestamp
    @Column(name = "reported_at", updatable = false)
    private Instant reportedAt;

    private String environment; // PRODUCTION, STAGING, DEVELOPMENT

    @Column(name = "affected_version")
    private String affectedVersion;

    @Column(name = "fixed_version")
    private String fixedVersion;

    @Column(name = "root_cause")
    private String rootCause;

    private String resolution;

    @Column(name = "duplicate_of_id")
    private UUID duplicateOfId;

    @Column(name = "customer_reported")
    @Builder.Default
    private boolean customerReported = false;

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "customer_impact")
    private String customerImpact;

    @Column(name = "response_due_at")
    private Instant responseDueAt;

    @Column(name = "fix_due_at")
    private Instant fixDueAt;

    @Column(name = "responded_at")
    private Instant respondedAt;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "verified_by")
    private UUID verifiedBy;
}
