package com.taskflow.modules.task.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {
    private UUID id;
    /** Human-readable project-scoped display ID, e.g. NETIQ-T1 or NETIQ-I3 */
    private String displayId;
    private Integer taskNumber;
    private UUID projectId;
    private UUID statusId;
    private UUID currentStatusId;
    private String taskType;
    private UUID departmentId;
    private UUID teamId;
    private Instant escalatedAt;
    private int escalationCount;
    private String title;
    private String description;
    private String priority;
    private Instant startDate;
    private Instant dueDate;
    private Integer storyPoints;
    private UUID parentTaskId;
    private UUID phaseId;
    private UUID organizationId;
    private int version;
    private UUID createdBy;
    private Instant createdAt;
    private Instant updatedAt;

    // Associations
    private List<UUID> assigneeIds;
    private List<UUID> predecessorIds;
}

