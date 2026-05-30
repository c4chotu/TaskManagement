package com.taskflow.modules.auth.repository;

import com.taskflow.modules.auth.domain.PlanTier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlanTierRepository extends JpaRepository<PlanTier, UUID> {
    Optional<PlanTier> findByName(String name);
}
