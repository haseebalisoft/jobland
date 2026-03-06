-- Job assignments table to replace direct leads storage.
-- Each row links a BD and (optionally) a user to a job from the jobs table.
-- This allows dropping the old leads table safely.

CREATE TABLE IF NOT EXISTS job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  bd_id UUID NOT NULL REFERENCES bds(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_assignments_bd_id ON job_assignments(bd_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_user_id ON job_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_created_at ON job_assignments(created_at);

