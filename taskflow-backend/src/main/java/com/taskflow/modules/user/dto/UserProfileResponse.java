package com.taskflow.modules.user.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class UserProfileResponse {
    private UUID id;
    private String email;
    private String name;
    private String role;
    private UUID organizationId;
    private String avatarUrl;
    private String bio;
}
