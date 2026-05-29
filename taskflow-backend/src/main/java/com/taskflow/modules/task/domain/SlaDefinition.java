package com.taskflow.modules.task.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "sla_definitions", schema = "tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlaDefinition {

    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(nullable = false)
    private String severity; // SEV0, SEV1, SEV2, SEV3, SEV4

    @Column(name = "response_time_minutes", nullable = false)
    private int responseTimeMinutes;

    @Column(name = "fix_time_minutes", nullable = false)
    private int fixTimeMinutes;

    @Column(name = "escalate_after_minutes")
    private Integer escalateAfterMinutes;

    @Column(name = "escalate_to_role")
    private String escalateToRole;

    @Column(name = "business_hours_only")
    @Builder.Default
    private boolean businessHoursOnly = true;
}
