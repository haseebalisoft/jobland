-- Add bd_id to jobs so we know which BD sourced a job.
-- When a BD is deleted, their jobs should be deleted as well.

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS bd_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_jobs_bd_id ON jobs(bd_id);

