-- Copy existing BDs from bds table into users table (same id) so that
-- user_bd_assignments.bd_id and job_assignments.bd_id (FK to users) are satisfied.
-- If a BD email already exists in users, we point assignments to that user instead.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 1) Point user_bd_assignments.bd_id to the users row with same email (when bd_id is from bds and that email exists in users)
UPDATE user_bd_assignments uba
SET bd_id = u.id
FROM users u, bds b
WHERE uba.bd_id = b.id
  AND LOWER(u.email) = LOWER(b.email);

-- 2) Same for job_assignments
UPDATE job_assignments ja
SET bd_id = u.id
FROM users u, bds b
WHERE ja.bd_id = b.id
  AND LOWER(u.email) = LOWER(b.email);

-- 3) Copy bds rows into users only when that id is not in users AND that email is not in users (avoids duplicate email)
INSERT INTO users (id, full_name, email, password_hash, role, is_verified, subscription_plan, is_active, created_at, updated_at)
SELECT
  b.id,
  b.full_name,
  b.email,
  COALESCE(b.password_hash, crypt('changeme', gen_salt('bf'))),
  'bd',
  true,
  'free',
  COALESCE(b.is_active, true),
  COALESCE(b.created_at, NOW()),
  NOW()
FROM bds b
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = b.id)
  AND NOT EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = LOWER(b.email));
