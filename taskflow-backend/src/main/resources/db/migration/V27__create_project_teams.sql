-- Create project_teams table in projects schema
CREATE TABLE IF NOT EXISTS projects.project_teams (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects.projects(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES users.teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_project_team UNIQUE (project_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_project_teams_project ON projects.project_teams(project_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_team ON projects.project_teams(team_id);
