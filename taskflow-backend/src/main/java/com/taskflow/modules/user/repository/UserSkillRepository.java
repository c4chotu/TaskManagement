package com.taskflow.modules.user.repository;

import com.taskflow.modules.user.domain.UserSkill;
import com.taskflow.modules.user.domain.UserSkillId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserSkillRepository extends JpaRepository<UserSkill, UserSkillId> {
    List<UserSkill> findByUserId(UUID userId);
}
