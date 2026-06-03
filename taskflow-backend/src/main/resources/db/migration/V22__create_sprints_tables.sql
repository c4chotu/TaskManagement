-- Create sprints table in projects schema
CREATE TABLE projects.sprints (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNED',
    estimated_hours NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sprints_project ON projects.sprints(project_id);
CREATE INDEX idx_sprints_status ON projects.sprints(status);

-- Add sprint_id to tasks.tasks table referencing projects.sprints
ALTER TABLE tasks.tasks ADD COLUMN sprint_id UUID REFERENCES projects.sprints(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_sprint ON tasks.tasks(sprint_id);
