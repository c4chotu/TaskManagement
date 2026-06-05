package com.taskflow.modules.project.repository;

import com.taskflow.modules.project.domain.ProjectTeam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectTeamRepository extends JpaRepository<ProjectTeam, UUID> {
    List<ProjectTeam> findByProjectId(UUID projectId);
    Optional<ProjectTeam> findByProjectIdAndTeamId(UUID projectId, UUID teamId);
}
