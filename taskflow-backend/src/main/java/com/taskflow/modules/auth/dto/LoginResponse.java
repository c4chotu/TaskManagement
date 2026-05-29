package com.taskflow.modules.auth.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    private UUID userId;
    private UUID orgId;
    private String email;
    private String name;
}
