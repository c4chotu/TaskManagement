package com.taskflow.modules.auth.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "plan_tiers", schema = "auth")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanTier {
    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(name = "max_users", nullable = false)
    @Builder.Default
    private int maxUsers = 5;

    @Column(name = "max_projects", nullable = false)
    @Builder.Default
    private int maxProjects = 3;

    @Column(name = "max_storage_gb", nullable = false)
    @Builder.Default
    private int maxStorageGb = 5;

    @Column(name = "price_monthly_usd", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal priceMonthlyUsd = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String features;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
