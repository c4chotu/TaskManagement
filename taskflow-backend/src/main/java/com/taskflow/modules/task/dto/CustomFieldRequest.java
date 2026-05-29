package com.taskflow.modules.task.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CustomFieldRequest {
    @NotBlank(message = "Field name cannot be blank")
    private String name;
    
    @NotBlank(message = "Field type is required")
    private String fieldType; // TEXT, NUMBER, DATE, DROPDOWN, CHECKBOX, MULTI_SELECT
    
    private String options; // JSON serialized string for options
}
