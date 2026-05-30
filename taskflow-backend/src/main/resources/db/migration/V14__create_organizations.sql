-- Create organizations table in auth schema
CREATE TABLE auth.organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    pricing_tier VARCHAR(50) NOT NULL DEFAULT 'FREE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed existing organization for Avendum Tech
INSERT INTO auth.organizations (id, name, pricing_tier)
VALUES ('ab0c0d0e-1234-5678-abcd-efabcdef0000', 'Avendum Tech', 'ENTERPRISE')
ON CONFLICT (id) DO NOTHING;

-- Seed default TaskFlow Admin Org for Super Admin
INSERT INTO auth.organizations (id, name, pricing_tier)
VALUES ('00000000-0000-0000-0000-000000000000', 'TaskFlow Admin Org', 'ENTERPRISE')
ON CONFLICT (id) DO NOTHING;
