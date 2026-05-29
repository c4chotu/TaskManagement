-- Custom status definitions per project
CREATE TABLE tasks.custom_task_statuses (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
    department_id UUID REFERENCES users.departments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- PLANNING, ACTIVE, COMPLETED, BLOCKED
    color VARCHAR(7) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    requires_comment BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    auto_transition_days INTEGER, -- Auto move after X days
    transition_to_on_auto UUID REFERENCES tasks.custom_task_statuses(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, project_id, name)
);

-- Status transition rules (who can transition)
CREATE TABLE tasks.status_transitions (
    id UUID PRIMARY KEY,
    from_status_id UUID REFERENCES tasks.custom_task_statuses(id) ON DELETE CASCADE,
    to_status_id UUID REFERENCES tasks.custom_task_statuses(id) ON DELETE CASCADE,
    allowed_role VARCHAR(50), -- NULL means anyone with write access
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_role VARCHAR(50),
    webhook_url TEXT,
    UNIQUE(from_status_id, to_status_id)
);

-- Status transition history
CREATE TABLE tasks.status_history (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    from_status_id UUID REFERENCES tasks.custom_task_statuses(id) ON DELETE SET NULL,
    to_status_id UUID NOT NULL REFERENCES tasks.custom_task_statuses(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    comment TEXT,
    time_in_status_minutes INTEGER -- Calculated duration in previous status
);

-- Add current_status_id to tasks.tasks referencing tasks.custom_task_statuses
ALTER TABLE tasks.tasks ADD COLUMN current_status_id UUID REFERENCES tasks.custom_task_statuses(id) ON DELETE RESTRICT;
