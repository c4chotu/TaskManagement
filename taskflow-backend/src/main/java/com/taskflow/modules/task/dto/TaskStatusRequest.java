package com.taskflow.modules.task.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TaskStatusRequest {
    @NotBlank(message = "Status name cannot be blank")
    private String name;
    private String color;
    private int sortOrder;
    private boolean isCompleted;
}
