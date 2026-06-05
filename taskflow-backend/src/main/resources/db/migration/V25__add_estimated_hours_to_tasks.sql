-- Migration V25: Add estimated_hours to tasks table
ALTER TABLE tasks.tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(10, 2);
