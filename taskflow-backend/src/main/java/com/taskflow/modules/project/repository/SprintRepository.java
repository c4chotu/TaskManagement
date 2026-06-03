package com.taskflow.modules.project.repository;

import com.taskflow.modules.project.domain.Sprint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SprintRepository extends JpaRepository<Sprint, UUID> {
    List<Sprint> findByProjectId(UUID projectId);
    List<Sprint> findByProjectIdOrderByStartDateAsc(UUID projectId);
}
