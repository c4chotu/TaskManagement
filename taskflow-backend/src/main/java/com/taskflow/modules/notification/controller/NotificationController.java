package com.taskflow.modules.notification.controller;

import com.taskflow.modules.notification.domain.Notification;
import com.taskflow.modules.notification.domain.UserNotificationPreferences;
import com.taskflow.modules.notification.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<Notification>> listNotifications() {
        return ResponseEntity.ok(notificationService.listNotifications());
    }

    @GetMapping("/unread/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount()));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable UUID id) {
        return ResponseEntity.ok(notificationService.markAsRead(id));
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<Void> markAllAsRead() {
        notificationService.markAllAsRead();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/preferences")
    public ResponseEntity<List<UserNotificationPreferences>> getPreferences() {
        return ResponseEntity.ok(notificationService.getPreferences());
    }

    @PatchMapping("/preferences")
    public ResponseEntity<UserNotificationPreferences> updatePreferences(@RequestBody Map<String, Object> body) {
        String notificationType = (String) body.get("notificationType");
        boolean inApp = body.get("inAppEnabled") == null || (Boolean) body.get("inAppEnabled");
        boolean email = body.get("emailEnabled") == null || (Boolean) body.get("emailEnabled");
        return ResponseEntity.ok(notificationService.updatePreferences(notificationType, inApp, email));
    }
}
