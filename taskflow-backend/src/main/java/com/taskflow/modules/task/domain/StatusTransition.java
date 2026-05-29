package com.taskflow.modules.task.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "status_transitions", schema = "tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatusTransition {

    @Id
    private UUID id;

    @Column(name = "from_status_id", nullable = false)
    private UUID fromStatusId;

    @Column(name = "to_status_id", nullable = false)
    private UUID toStatusId;

    @Column(name = "allowed_role")
    private String allowedRole; // NULL means anyone with write access

    @Column(name = "requires_approval")
    @Builder.Default
    private boolean requiresApproval = false;

    @Column(name = "approval_role")
    private String approvalRole;

    @Column(name = "webhook_url")
    private String webhookUrl;
}
