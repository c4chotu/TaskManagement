-- Create teams table in users schema
CREATE TABLE users.teams (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organization_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teams_org ON users.teams(organization_id);

-- Create team_members table in users schema
CREATE TABLE users.team_members (
    id UUID PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES users.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_team_user UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_members_team ON users.team_members(team_id);
CREATE INDEX idx_team_members_user ON users.team_members(user_id);
