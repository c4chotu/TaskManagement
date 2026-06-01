-- Create badges table in tasks schema and add category/badge_id to tasks.tasks

CREATE TABLE IF NOT EXISTS tasks.badges (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    color VARCHAR(20),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tasks.tasks
    ADD COLUMN IF NOT EXISTS category VARCHAR(100);

ALTER TABLE tasks.tasks
    ADD COLUMN IF NOT EXISTS badge_id UUID;

-- Add FK constraint to badges
ALTER TABLE tasks.tasks
    ADD CONSTRAINT fk_tasks_badge FOREIGN KEY (badge_id) REFERENCES tasks.badges(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks.tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_badge ON tasks.tasks(badge_id);
