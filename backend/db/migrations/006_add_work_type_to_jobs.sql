-- Work type for jobs: hybrid, onsite, remote (from OneClick extension)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_type VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_jobs_work_type ON jobs(work_type) WHERE work_type IS NOT NULL;
