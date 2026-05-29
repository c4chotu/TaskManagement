package com.taskflow.modules.task.repository;

import com.taskflow.modules.task.domain.SlaDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SlaDefinitionRepository extends JpaRepository<SlaDefinition, UUID> {
    Optional<SlaDefinition> findByOrganizationIdAndSeverity(UUID organizationId, String severity);
}
