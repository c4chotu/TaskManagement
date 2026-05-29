-- Alter tasks table in tasks schema
ALTER TABLE tasks.tasks ADD COLUMN task_type VARCHAR(20) NOT NULL DEFAULT 'TASK';
ALTER TABLE tasks.tasks ADD COLUMN department_id UUID REFERENCES users.departments(id);
ALTER TABLE tasks.tasks ADD COLUMN team_id UUID REFERENCES users.teams(id);
ALTER TABLE tasks.tasks ADD COLUMN escalated_at TIMESTAMPTZ;
ALTER TABLE tasks.tasks ADD COLUMN escalation_count INTEGER DEFAULT 0;

-- Issue-specific fields in tasks schema
CREATE TABLE tasks.issue_details (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    severity VARCHAR(10) NOT NULL, -- SEV0, SEV1, SEV2, SEV3, SEV4
    reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    environment VARCHAR(50), -- PRODUCTION, STAGING, DEVELOPMENT
    affected_version VARCHAR(50),
    fixed_version VARCHAR(50),
    root_cause TEXT,
    resolution TEXT,
    duplicate_of_id UUID REFERENCES tasks.tasks(id) ON DELETE SET NULL,
    customer_reported BOOLEAN DEFAULT FALSE,
    customer_name VARCHAR(255),
    customer_impact VARCHAR(500),
    response_due_at TIMESTAMPTZ,
    fix_due_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(task_id)
);

-- SLA definitions per severity in tasks schema
CREATE TABLE tasks.sla_definitions (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    severity VARCHAR(10) NOT NULL,
    response_time_minutes INTEGER NOT NULL,  -- First response SLA
    fix_time_minutes INTEGER NOT NULL,       -- Resolution SLA
    escalate_after_minutes INTEGER,          -- Escalate if not resolved
    escalate_to_role VARCHAR(50),            -- Role to escalate to
    business_hours_only BOOLEAN DEFAULT TRUE,
    UNIQUE(organization_id, severity)
);

-- Issue escalations log in tasks schema
CREATE TABLE tasks.issue_escalations (
    id UUID PRIMARY KEY,
    issue_id UUID NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    escalated_from_role VARCHAR(50),
    escalated_to_role VARCHAR(50),
    escalated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    escalated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT,
    resolved_at TIMESTAMPTZ
);

-- On-call schedule for issues in tasks schema
CREATE TABLE tasks.on_call_schedules (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    coverage_type VARCHAR(20) NOT NULL, -- PRIMARY, SECONDARY, TERTIARY
    UNIQUE(organization_id, week_start_date, coverage_type)
);
