package com.taskflow.modules.notification.repository;

import com.taskflow.modules.notification.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId);
    long countByUserIdAndIsRead(UUID userId, boolean isRead);
    List<Notification> findByUserIdAndIsRead(UUID userId, boolean isRead);
}
