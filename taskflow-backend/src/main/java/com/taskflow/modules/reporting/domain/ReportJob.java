package com.taskflow.modules.reporting.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "report_jobs", schema = "reporting")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportJob {
    @Id
    private UUID id;

    @Column(name = "organization_id")
    private UUID organizationId;

    @Column(name = "requested_by")
    private UUID requestedBy;

    @Column(name = "status")
    private String status; // PENDING, COMPLETED, FAILED

    @Column(name = "file_path")
    private String filePath;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
