-- Migration to add forgot password reset token support to users table
ALTER TABLE auth.users ADD COLUMN reset_token VARCHAR(255);
ALTER TABLE auth.users ADD COLUMN reset_token_expires_at TIMESTAMP WITH TIME ZONE;
