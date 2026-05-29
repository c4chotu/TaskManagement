package com.taskflow.modules.notification.repository;

import com.taskflow.modules.notification.domain.UserNotificationPreferences;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserNotificationPreferencesRepository extends JpaRepository<UserNotificationPreferences, UUID> {
    List<UserNotificationPreferences> findByUserId(UUID userId);
    Optional<UserNotificationPreferences> findByUserIdAndNotificationType(UUID userId, String notificationType);
}
