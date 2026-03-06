-- HiredLogics: user_bd_assignments + BD auth + leads table
-- Run this after your existing schema (users, bds, profiles, jobs, applications, subscriptions).

-- 1) Add password_hash to bds so BD can sign up / log in
ALTER TABLE bds ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2) User–BD assignment (Admin assigns one or multiple BDs to a user)
CREATE TABLE IF NOT EXISTS user_bd_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bd_id UUID NOT NULL REFERENCES bds(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, bd_id)
);

CREATE INDEX IF NOT EXISTS idx_user_bd_user ON user_bd_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bd_bd ON user_bd_assignments(bd_id);

-- 3) Ensure users has role (for filtering admin "users" vs admin/bd)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role VARCHAR(50);
    UPDATE users SET role = 'user' WHERE role IS NULL;
  END IF;
END $$;

-- 4) Leads table (if not exists) with status + updated_at
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  job_title VARCHAR(255),
  company_name VARCHAR(255),
  job_link TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  assigned_user_id UUID REFERENCES users(id),
  bd_id UUID REFERENCES bds(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE leads ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_leads_bd_id ON leads(bd_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_user_id ON leads(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
