-- Add rule_type to automation_rules
ALTER TABLE automations.automation_rules ADD COLUMN rule_type VARCHAR(100) NOT NULL DEFAULT 'STANDARD';

-- Add execution_log to automation_executions
ALTER TABLE automations.automation_executions ADD COLUMN execution_log TEXT;
