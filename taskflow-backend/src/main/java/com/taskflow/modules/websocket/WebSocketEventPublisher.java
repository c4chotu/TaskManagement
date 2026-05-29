package com.taskflow.modules.websocket;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

/**
 * Central publisher for real-time WebSocket events.
 *
 * Subscriptions:
 *  - /topic/projects/{projectId}/tasks  — task CRUD events
 *  - /user/{userId}/queue/notifications — personal notification delivery
 *  - /topic/projects/{projectId}/time   — time entry events
 */
@Component
public class WebSocketEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishTaskEvent(UUID projectId, String eventType, Object payload) {
        messagingTemplate.convertAndSend(
                "/topic/projects/" + projectId + "/tasks",
                Map.of("event", eventType, "data", payload)
        );
    }

    public void publishNotification(UUID userId, Object notification) {
        messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/queue/notifications",
                notification
        );
    }

    public void publishTimeEvent(UUID projectId, String eventType, Object payload) {
        messagingTemplate.convertAndSend(
                "/topic/projects/" + projectId + "/time",
                Map.of("event", eventType, "data", payload)
        );
    }

    public void publishProjectEvent(UUID projectId, String eventType, Object payload) {
        messagingTemplate.convertAndSend(
                "/topic/projects/" + projectId,
                Map.of("event", eventType, "data", payload)
        );
    }
}
