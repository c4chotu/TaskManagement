package com.taskflow.modules.notification.service;

import com.taskflow.common.exception.EntityNotFoundException;
import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.notification.domain.Notification;
import com.taskflow.modules.notification.domain.UserNotificationPreferences;
import com.taskflow.modules.notification.repository.NotificationRepository;
import com.taskflow.modules.notification.repository.UserNotificationPreferencesRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserNotificationPreferencesRepository preferencesRepository;

    public NotificationService(NotificationRepository notificationRepository,
                                UserNotificationPreferencesRepository preferencesRepository) {
        this.notificationRepository = notificationRepository;
        this.preferencesRepository = preferencesRepository;
    }

    @Transactional
    public Notification createNotification(UUID userId, UUID orgId, String type, String title, String body,
                                           String entityType, UUID entityId) {
        Notification notification = Notification.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .organizationId(orgId)
                .type(type)
                .title(title)
                .body(body)
                .entityType(entityType)
                .entityId(entityId)
                .isRead(false)
                .build();
        return notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<Notification> listNotifications() {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount() {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return notificationRepository.countByUserIdAndIsRead(userId, false);
    }

    @Transactional
    public Notification markAsRead(UUID notificationId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new EntityNotFoundException("Notification not found: " + notificationId));

        if (!Objects.equals(notification.getUserId(), userId)) {
            throw new IllegalArgumentException("Notification does not belong to current user");
        }

        notification.setRead(true);
        notification.setReadAt(Instant.now());
        return notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead() {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        List<Notification> unread = notificationRepository.findByUserIdAndIsRead(userId, false);
        Instant now = Instant.now();
        unread.forEach(n -> {
            n.setRead(true);
            n.setReadAt(now);
        });
        notificationRepository.saveAll(unread);
    }

    @Transactional(readOnly = true)
    public List<UserNotificationPreferences> getPreferences() {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return preferencesRepository.findByUserId(userId);
    }

    @Transactional
    public UserNotificationPreferences updatePreferences(String notificationType, boolean inApp, boolean email) {
        UUID userId = SecurityContextHelper.getCurrentUserId();

        UserNotificationPreferences prefs = preferencesRepository
                .findByUserIdAndNotificationType(userId, notificationType)
                .orElseGet(() -> UserNotificationPreferences.builder()
                        .id(UUID.randomUUID())
                        .userId(userId)
                        .notificationType(notificationType)
                        .build());

        prefs.setInAppEnabled(inApp);
        prefs.setEmailEnabled(email);
        return preferencesRepository.save(prefs);
    }
}
