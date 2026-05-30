-- V16: Widen role_level check constraint to allow SUPER_ADMIN (level 10)
-- The old constraint CHECK (role_level BETWEEN 0 AND 5) rejects level 10.

ALTER TABLE auth.user_roles
    DROP CONSTRAINT IF EXISTS user_roles_role_level_check;

ALTER TABLE auth.user_roles
    ADD CONSTRAINT user_roles_role_level_check
        CHECK (role_level IN (0, 1, 2, 3, 4, 5, 10));
