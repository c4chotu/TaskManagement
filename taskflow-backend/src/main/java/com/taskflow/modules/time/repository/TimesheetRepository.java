package com.taskflow.modules.time.repository;

import com.taskflow.modules.time.domain.Timesheet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TimesheetRepository extends JpaRepository<Timesheet, UUID> {
    Optional<Timesheet> findByUserIdAndWeekStart(UUID userId, LocalDate weekStart);
    List<Timesheet> findByUserIdAndOrganizationId(UUID userId, UUID organizationId);
    List<Timesheet> findByOrganizationIdAndStatus(UUID organizationId, String status);
}
