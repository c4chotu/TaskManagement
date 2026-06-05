-- Create automation_rule_types table in automations schema
CREATE TABLE IF NOT EXISTS automations.automation_rule_types (
    id UUID PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    trigger_type VARCHAR(100) NOT NULL,
    default_action_type VARCHAR(100),
    is_system BOOLEAN NOT NULL DEFAULT TRUE
);

-- Seed initial system automation rule types
INSERT INTO automations.automation_rule_types (id, code, name, description, category, trigger_type, default_action_type, is_system)
VALUES 
    ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'TASK_CREATED', 'Task Created', 'Triggered when a new task is created', 'TASK', 'TASK_CREATED', 'ASSIGN_USER', TRUE),
    ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'TASK_STATUS_UPDATED', 'Task Status Updated', 'Triggered when a task status changes', 'TASK', 'TASK_STATUS_UPDATED', 'SEND_NOTIFICATION', TRUE),
    ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'ISSUE_REPORTED', 'Incident Escalated', 'Triggered when an incident of high severity is reported', 'TASK', 'ISSUE_REPORTED', 'ROUTE_INCIDENT', TRUE),
    ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'SPRINT_COMPLETED', 'Sprint Completed', 'Triggered when a sprint/phase is marked completed', 'SPRINT', 'SPRINT_COMPLETED', 'UPDATE_PROJECT_STATUS', TRUE)
ON CONFLICT (code) DO NOTHING;
