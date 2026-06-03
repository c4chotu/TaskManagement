-- Alter project_id to be nullable in automations.automation_rules
ALTER TABLE automations.automation_rules ALTER COLUMN project_id DROP NOT NULL;

-- Add team_id to automations.automation_rules
ALTER TABLE automations.automation_rules ADD COLUMN team_id UUID REFERENCES users.teams(id) ON DELETE CASCADE;
CREATE INDEX idx_automation_rules_team ON automations.automation_rules(team_id);
