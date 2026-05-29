package com.taskflow.modules.user.repository;

import com.taskflow.modules.user.domain.SkillCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SkillCategoryRepository extends JpaRepository<SkillCategory, UUID> {
    List<SkillCategory> findByOrganizationId(UUID organizationId);
}
