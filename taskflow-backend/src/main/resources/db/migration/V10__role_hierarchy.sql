-- Department table in users schema
CREATE TABLE users.departments (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    head_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Department Head (role level 3)
    parent_department_id UUID REFERENCES users.departments(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Alter existing users.teams table
ALTER TABLE users.teams ADD COLUMN department_id UUID REFERENCES users.departments(id);
ALTER TABLE users.teams ADD COLUMN description TEXT;
ALTER TABLE users.teams ADD COLUMN lead_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;  -- Team Lead (role level 2)
ALTER TABLE users.teams ADD COLUMN deleted_at TIMESTAMPTZ;

-- User role assignments with hierarchy in auth schema
CREATE TABLE auth.user_roles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    role_level INTEGER NOT NULL CHECK (role_level BETWEEN 0 AND 5),
    role_name VARCHAR(50) NOT NULL,
    department_id UUID REFERENCES users.departments(id) ON DELETE CASCADE,
    team_id UUID REFERENCES users.teams(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    UNIQUE(user_id, organization_id, department_id, team_id)
);

-- Role permissions matrix in auth schema
CREATE TABLE auth.role_permissions (
    id UUID PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    scope VARCHAR(20) DEFAULT 'ORG',  -- ORG, DEPT, TEAM, PROJECT, SELF
    UNIQUE(role_name, permission)
);

-- Auto-assignment rules in auth schema
CREATE TABLE auth.auto_assignment_rules (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL,  -- TASK_CREATED, STATUS_CHANGED, ASSIGNEE_CHANGED
    condition JSONB NOT NULL,
    action JSONB NOT NULL,  -- { assign_to: "role_level" | "specific_user", value: ... }
    priority INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
