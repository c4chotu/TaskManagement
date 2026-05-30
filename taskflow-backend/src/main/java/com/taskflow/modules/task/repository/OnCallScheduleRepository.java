package com.taskflow.modules.task.repository;

import com.taskflow.modules.task.domain.OnCallSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OnCallScheduleRepository extends JpaRepository<OnCallSchedule, UUID> {
    Optional<OnCallSchedule> findByOrganizationIdAndWeekStartDateAndCoverageType(
            UUID organizationId, LocalDate weekStartDate, String coverageType
    );
    List<OnCallSchedule> findByOrganizationId(UUID organizationId);
}
