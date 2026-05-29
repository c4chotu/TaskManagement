package com.taskflow.modules.auth.domain;

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
@Table(name = "role_permissions", schema = "auth")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RolePermission {

    @Id
    private UUID id;

    @Column(name = "role_name", nullable = false)
    private String roleName;

    @Column(nullable = false)
    private String permission;

    @Column(nullable = false)
    @Builder.Default
    private String scope = "ORG";
}
