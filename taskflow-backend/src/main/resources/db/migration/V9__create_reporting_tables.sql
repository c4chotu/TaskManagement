-- Saved reports table for caching generated report results
CREATE TABLE reporting.saved_reports (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    project_id UUID REFERENCES projects.projects(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}',
    result_json JSONB,
    generated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_saved_reports_org ON reporting.saved_reports(organization_id);
CREATE INDEX idx_saved_reports_project ON reporting.saved_reports(project_id);
CREATE INDEX idx_saved_reports_type ON reporting.saved_reports(report_type);
