package com.taskflow.modules.project.repository;

import com.taskflow.modules.project.domain.ProjectJoinRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectJoinRequestRepository extends JpaRepository<ProjectJoinRequest, UUID> {
    List<ProjectJoinRequest> findByProjectId(UUID projectId);
    List<ProjectJoinRequest> findByProjectIdAndStatus(UUID projectId, String status);
}
