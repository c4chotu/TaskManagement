package com.taskflow.modules.task.repository;

import com.taskflow.modules.task.domain.StatusTransition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StatusTransitionRepository extends JpaRepository<StatusTransition, UUID> {
    List<StatusTransition> findByFromStatusId(UUID fromStatusId);
    Optional<StatusTransition> findByFromStatusIdAndToStatusId(UUID fromStatusId, UUID toStatusId);
}
