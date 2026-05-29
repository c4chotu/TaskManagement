package com.taskflow.modules.user.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserSkillId implements Serializable {
    private UUID userId;
    private UUID skillId;
}
