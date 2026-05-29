package com.taskflow.modules.task.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
public class TaskRequest {
    @NotNull(message = "Project ID is required")
    private UUID projectId;

    private UUID statusId;
    private UUID currentStatusId;
    private String taskType;
    private UUID departmentId;
    private UUID teamId;

    @NotBlank(message = "Task title cannot be blank")
    private String title;

    private String description;

    private String priority;

    private Instant startDate;

    private Instant dueDate;

    private Integer storyPoints;

    private UUID parentTaskId;

    private UUID phaseId;
}
