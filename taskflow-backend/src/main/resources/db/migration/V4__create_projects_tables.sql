-- Create projects table in projects schema
CREATE TABLE projects.projects (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    type VARCHAR(50),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    organization_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_org ON projects.projects(organization_id);

-- Create project_members table in projects schema
CREATE TABLE projects.project_members (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_project_user UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_members_project ON projects.project_members(project_id);
CREATE INDEX idx_project_members_user ON projects.project_members(user_id);

-- Create phases table in projects schema
CREATE TABLE projects.phases (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_phases_project ON projects.phases(project_id);
