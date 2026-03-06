-- Fix: When BDs are stored in users table (role='bd'), bd_id must reference users(id) not bds(id).
-- Run this if you get: Key (bd_id)=... is not present in table "bds".

-- job_assignments: used when BD creates/assigns jobs (leads)
ALTER TABLE job_assignments DROP CONSTRAINT IF EXISTS job_assignments_bd_id_fkey;
ALTER TABLE job_assignments ADD CONSTRAINT job_assignments_bd_id_fkey
  FOREIGN KEY (bd_id) REFERENCES users(id) ON DELETE CASCADE;

-- user_bd_assignments: used when admin assigns BDs to a user
ALTER TABLE user_bd_assignments DROP CONSTRAINT IF EXISTS user_bd_assignments_bd_id_fkey;
ALTER TABLE user_bd_assignments ADD CONSTRAINT user_bd_assignments_bd_id_fkey
  FOREIGN KEY (bd_id) REFERENCES users(id) ON DELETE CASCADE;
