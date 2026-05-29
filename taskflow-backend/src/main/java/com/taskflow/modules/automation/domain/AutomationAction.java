package com.taskflow.modules.automation.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Type;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "automation_actions", schema = "automations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AutomationAction {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id", nullable = false)
    @JsonIgnore
    private AutomationRule rule;

    @Column(name = "action_type", nullable = false, length = 100)
    private String actionType;

    @Type(JsonBinaryType.class)
    @Column(name = "action_config", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> actionConfig = new HashMap<>();

    @Column(nullable = false)
    @Builder.Default
    private int position = 0;
}
