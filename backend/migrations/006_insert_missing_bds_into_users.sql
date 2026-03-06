-- Ensure every BD in bds table also exists in users with the SAME id,
-- so user_bd_assignments.bd_id (FK to users) is satisfied.
-- If the BD's email already exists in users, we insert with a suffix so email stays unique.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (id, full_name, email, password_hash, role, is_verified, subscription_plan, is_active, created_at, updated_at)
SELECT
  b.id,
  b.full_name,
  -- Use unique email: if already in users, append .bd so we don't violate unique
  CASE
    WHEN EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = LOWER(b.email)) 
    THEN b.email || '.bd'
    ELSE b.email
  END,
  COALESCE(b.password_hash, crypt('changeme', gen_salt('bf'))),
  'bd',
  true,
  'free',
  COALESCE(b.is_active, true),
  COALESCE(b.created_at, NOW()),
  NOW()
FROM bds b
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = b.id);
