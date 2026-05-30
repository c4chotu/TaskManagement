-- V15: Add project key and task display IDs

-- Add key and task counter to projects
ALTER TABLE projects.projects
    ADD COLUMN IF NOT EXISTS key VARCHAR(10),
    ADD COLUMN IF NOT EXISTS task_counter INT NOT NULL DEFAULT 0;

-- Add display fields to tasks
ALTER TABLE tasks.tasks
    ADD COLUMN IF NOT EXISTS task_number INT,
    ADD COLUMN IF NOT EXISTS display_id VARCHAR(25);

-- Index for display_id lookups
CREATE INDEX IF NOT EXISTS idx_tasks_display_id ON tasks.tasks(display_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_key_org ON projects.projects(organization_id, key) WHERE key IS NOT NULL;

-- Add plan_tiers table for SuperAdmin billing view
CREATE TABLE IF NOT EXISTS auth.plan_tiers (
    id UUID PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    max_users INT NOT NULL DEFAULT 5,
    max_projects INT NOT NULL DEFAULT 3,
    max_storage_gb INT NOT NULL DEFAULT 5,
    price_monthly_usd NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    features TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed plan tiers
INSERT INTO auth.plan_tiers (id, name, max_users, max_projects, max_storage_gb, price_monthly_usd, features)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'FREE',         5,    3,    5,     0.00,  'Basic tasks, 5 members, 3 projects'),
    ('10000000-0000-0000-0000-000000000002', 'STARTER',      25,   10,   20,    29.00, 'Time tracking, 25 members, 10 projects, CSV import'),
    ('10000000-0000-0000-0000-000000000003', 'PROFESSIONAL', 100,  50,   100,   79.00, 'Automations, SLA, 100 members, 50 projects, bulk upload'),
    ('10000000-0000-0000-0000-000000000004', 'ENTERPRISE',   9999, 9999, 9999,  199.00,'Unlimited members, SSO, custom roles, audit logs, priority support')
ON CONFLICT (name) DO NOTHING;
