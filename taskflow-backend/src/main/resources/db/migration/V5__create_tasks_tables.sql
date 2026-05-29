-- Create task_statuses table
CREATE TABLE tasks.task_statuses (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#CCCCCC',
    sort_order INT NOT NULL DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_project_status UNIQUE (project_id, name)
);

CREATE INDEX idx_task_statuses_project ON tasks.task_statuses(project_id);

-- Create tasks table
CREATE TABLE tasks.tasks (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    status_id UUID NOT NULL REFERENCES tasks.task_statuses(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    start_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    story_points INT,
    parent_task_id UUID REFERENCES tasks.tasks(id) ON DELETE SET NULL,
    phase_id UUID REFERENCES projects.phases(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL,
    version INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tasks_project ON tasks.tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks.tasks(status_id);
CREATE INDEX idx_tasks_parent ON tasks.tasks(parent_task_id);
CREATE INDEX idx_tasks_org ON tasks.tasks(organization_id);
CREATE INDEX idx_tasks_deleted ON tasks.tasks(deleted_at);

-- Create task_assignments table
CREATE TABLE tasks.task_assignments (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'ASSIGNEE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_task_user_assignment UNIQUE (task_id, user_id, role)
);

CREATE INDEX idx_task_assignments_task ON tasks.task_assignments(task_id);
CREATE INDEX idx_task_assignments_user ON tasks.task_assignments(user_id);

-- Create task_dependencies table
CREATE TABLE tasks.task_dependencies (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    predecessor_id UUID NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) NOT NULL DEFAULT 'FINISH_TO_START',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_task_dependency UNIQUE (task_id, predecessor_id),
    CONSTRAINT check_no_self_dependency CHECK (task_id <> predecessor_id)
);

CREATE INDEX idx_task_dependencies_task ON tasks.task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_pred ON tasks.task_dependencies(predecessor_id);

-- Create comments table (polymorphic: entity_type and entity_id)
CREATE TABLE tasks.comments (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_entity ON tasks.comments(entity_type, entity_id);

-- Create custom_fields table
CREATE TABLE tasks.custom_fields (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    options TEXT, -- JSON serialization for dropdown options, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_project_custom_field UNIQUE (project_id, name)
);

CREATE INDEX idx_custom_fields_project ON tasks.custom_fields(project_id);

-- Create custom_field_values table
CREATE TABLE tasks.custom_field_values (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    custom_field_id UUID NOT NULL REFERENCES tasks.custom_fields(id) ON DELETE CASCADE,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_task_custom_field UNIQUE (task_id, custom_field_id)
);

CREATE INDEX idx_cf_values_task ON tasks.custom_field_values(task_id);

-- Create task_activities table for audit trail
CREATE TABLE tasks.task_activities (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    description VARCHAR(500) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_activities_task ON tasks.task_activities(task_id);
