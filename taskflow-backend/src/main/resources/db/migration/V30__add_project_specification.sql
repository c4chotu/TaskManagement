-- Add specification column to projects table to match JPA entity
ALTER TABLE projects.projects
    ADD COLUMN specification TEXT;
