-- Routing rules for automatic assignment in tasks schema
CREATE TABLE tasks.routing_rules (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    task_type VARCHAR(20) NOT NULL, -- TASK, ISSUE, BUG, FEATURE, etc.
    trigger_condition JSONB NOT NULL, -- { field: "priority", operator: "=", value: "URGENT" }
    source_department_id UUID REFERENCES users.departments(id) ON DELETE SET NULL,
    source_team_id UUID REFERENCES users.teams(id) ON DELETE SET NULL,
    target_department_id UUID REFERENCES users.departments(id) ON DELETE SET NULL,
    target_team_id UUID REFERENCES users.teams(id) ON DELETE SET NULL,
    assign_to_role VARCHAR(50), -- TEAM_LEAD, TEAM_MEMBER, DEPT_HEAD
    assignment_strategy VARCHAR(50), -- ROUND_ROBIN, LEAST_BUSY, SKILL_MATCH, MANUAL
    auto_create_subtasks BOOLEAN DEFAULT FALSE,
    subtask_template JSONB,
    priority INTEGER DEFAULT 0, -- Higher priority rules checked first
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Skills mapping for tasks in users schema
CREATE TABLE users.skill_categories (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES users.skill_categories(id) ON DELETE SET NULL
);

CREATE TABLE users.user_skills (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES users.skill_categories(id) ON DELETE CASCADE,
    proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5),
    PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE tasks.task_skill_requirements (
    task_id UUID NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES users.skill_categories(id) ON DELETE CASCADE,
    required_level INTEGER CHECK (required_level BETWEEN 1 AND 5),
    PRIMARY KEY (task_id, skill_id)
);

-- Assignment history for load balancing in tasks schema
CREATE TABLE tasks.assignment_history (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assignment_reason VARCHAR(255), -- AUTO_ROUTING, MANUAL, ESCALATION
    routing_rule_id UUID REFERENCES tasks.routing_rules(id) ON DELETE SET NULL
);
