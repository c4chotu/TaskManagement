-- Automation rules table
CREATE TABLE automations.automation_rules (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_automation_rules_project ON automations.automation_rules(project_id);
CREATE INDEX idx_automation_rules_org ON automations.automation_rules(organization_id);

-- Automation conditions table
CREATE TABLE automations.automation_conditions (
    id UUID PRIMARY KEY,
    rule_id UUID NOT NULL REFERENCES automations.automation_rules(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    operator VARCHAR(50) NOT NULL,
    field_value TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_automation_conditions_rule ON automations.automation_conditions(rule_id);

-- Automation actions table
CREATE TABLE automations.automation_actions (
    id UUID PRIMARY KEY,
    rule_id UUID NOT NULL REFERENCES automations.automation_rules(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    action_config JSONB NOT NULL DEFAULT '{}',
    position INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_automation_actions_rule ON automations.automation_actions(rule_id);

-- Automation execution log
CREATE TABLE automations.automation_executions (
    id UUID PRIMARY KEY,
    rule_id UUID NOT NULL REFERENCES automations.automation_rules(id) ON DELETE CASCADE,
    trigger_entity_type VARCHAR(50),
    trigger_entity_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_automation_executions_rule ON automations.automation_executions(rule_id);
CREATE INDEX idx_automation_executions_status ON automations.automation_executions(status);
