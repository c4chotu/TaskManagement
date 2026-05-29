package com.taskflow.modules.task.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskSkillRequirementId implements Serializable {
    private UUID taskId;
    private UUID skillId;
}
