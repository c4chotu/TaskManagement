package com.taskflow.modules.time.repository;

import com.taskflow.modules.time.domain.TimeEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface TimeEntryRepository extends JpaRepository<TimeEntry, UUID> {
    List<TimeEntry> findByTaskIdAndUserId(UUID taskId, UUID userId);
    List<TimeEntry> findByUserIdAndOrganizationId(UUID userId, UUID organizationId);

    @Query("SELECT t FROM TimeEntry t WHERE t.userId = :userId AND t.startTime >= :from AND t.startTime <= :to")
    List<TimeEntry> findByUserIdAndDateRange(
            @Param("userId") UUID userId,
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query("SELECT t FROM TimeEntry t WHERE t.userId = :userId AND t.endTime IS NULL")
    java.util.Optional<TimeEntry> findActiveTimer(@Param("userId") UUID userId);

    @Query("SELECT te.userId, SUM(te.durationMinutes) FROM TimeEntry te " +
           "JOIN Task tk ON tk.id = te.taskId " +
           "WHERE tk.projectId = :projectId AND te.startTime >= :from AND te.startTime <= :to " +
           "GROUP BY te.userId")
    List<Object[]> sumMinutesPerUserForProject(
            @Param("projectId") UUID projectId,
            @Param("from") Instant from,
            @Param("to") Instant to);
}
