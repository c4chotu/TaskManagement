package com.taskflow.modules.task.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CustomFieldValueRequest {
    @NotNull(message = "Custom field ID is required")
    private UUID customFieldId;
    
    private String value;
}
