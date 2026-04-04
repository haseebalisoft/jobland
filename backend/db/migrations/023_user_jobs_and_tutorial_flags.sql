DO $$ BEGIN
  CREATE TYPE user_job_status AS ENUM ('saved', 'applied', 'interviewing', 'offer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS user_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  company VARCHAR(500) NOT NULL,
  job_url TEXT,
  salary_range VARCHAR(255),
  notes TEXT,
  status user_job_status NOT NULL DEFAULT 'saved',
  sort_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_jobs_user_id ON user_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_jobs_user_status ON user_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_jobs_created ON user_jobs(created_at DESC);

DROP TRIGGER IF EXISTS set_timestamp_user_jobs ON user_jobs;
CREATE TRIGGER set_timestamp_user_jobs
BEFORE UPDATE ON user_jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS user_tutorial_flags (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  skipped BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, feature)
);

DROP TRIGGER IF EXISTS set_timestamp_user_tutorial_flags ON user_tutorial_flags;
CREATE TRIGGER set_timestamp_user_tutorial_flags
BEFORE UPDATE ON user_tutorial_flags
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
