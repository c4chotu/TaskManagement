-- Add project_group and customer columns to projects.projects table
ALTER TABLE projects.projects ADD COLUMN project_group VARCHAR(100);
ALTER TABLE projects.projects ADD COLUMN customer VARCHAR(255);
