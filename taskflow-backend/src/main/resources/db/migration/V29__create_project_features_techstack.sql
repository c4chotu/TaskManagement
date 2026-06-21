-- Flyway migration: create tables for project features and tech stack
CREATE TABLE IF NOT EXISTS projects.project_features (
  project_id UUID NOT NULL,
  feature TEXT NOT NULL,
  CONSTRAINT pk_project_features PRIMARY KEY (project_id, feature),
  CONSTRAINT fk_project_features_project FOREIGN KEY (project_id) REFERENCES projects.projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_features_project_id ON projects.project_features(project_id);

CREATE TABLE IF NOT EXISTS projects.project_tech_stack (
  project_id UUID NOT NULL,
  tech TEXT NOT NULL,
  CONSTRAINT pk_project_tech_stack PRIMARY KEY (project_id, tech),
  CONSTRAINT fk_project_tech_stack_project FOREIGN KEY (project_id) REFERENCES projects.projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_tech_stack_project_id ON projects.project_tech_stack(project_id);
