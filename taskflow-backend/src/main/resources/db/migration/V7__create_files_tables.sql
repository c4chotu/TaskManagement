-- Create file_attachments table
CREATE TABLE files.file_attachments (
    id UUID PRIMARY KEY,
    original_filename VARCHAR(512) NOT NULL,
    stored_filename VARCHAR(512) NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'LOCAL',
    storage_path TEXT NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_attachments_entity ON files.file_attachments(entity_type, entity_id);
CREATE INDEX idx_file_attachments_org ON files.file_attachments(organization_id);
CREATE INDEX idx_file_attachments_uploader ON files.file_attachments(uploaded_by);
