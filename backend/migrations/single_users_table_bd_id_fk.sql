-- Use when BDs are in users table (role='bd'), not a separate bds table.
-- Makes user_bd_assignments.bd_id reference users(id). Run after 002_* migrations.

ALTER TABLE user_bd_assignments DROP CONSTRAINT IF EXISTS user_bd_assignments_bd_id_fkey;
ALTER TABLE user_bd_assignments ADD CONSTRAINT user_bd_assignments_bd_id_fkey
  FOREIGN KEY (bd_id) REFERENCES users(id) ON DELETE CASCADE;
