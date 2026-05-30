CREATE TABLE IF NOT EXISTS reporting.report_jobs (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    requested_by UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    file_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
