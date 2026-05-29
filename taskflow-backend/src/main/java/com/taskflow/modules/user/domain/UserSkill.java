package com.taskflow.modules.user.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "user_skills", schema = "users")
@IdClass(UserSkillId.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSkill {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Id
    @Column(name = "skill_id", nullable = false)
    private UUID skillId;

    @Column(name = "proficiency_level")
    private int proficiencyLevel; // 1 to 5
}
