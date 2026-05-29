package com.taskflow.modules.task.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "task_skill_requirements", schema = "tasks")
@IdClass(TaskSkillRequirementId.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskSkillRequirement {

    @Id
    @Column(name = "task_id", nullable = false)
    private UUID taskId;

    @Id
    @Column(name = "skill_id", nullable = false)
    private UUID skillId;

    @Column(name = "required_level")
    private int requiredLevel; // 1 to 5
}
