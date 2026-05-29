package com.taskflow.common.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.security.Principal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthenticatedUser implements Principal {
    private UUID id;
    private String email;
    private String name;
    private UUID orgId;
    private String role;

    @Override
    public String getName() {
        return name;
    }
}
