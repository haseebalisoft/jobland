CREATE TABLE IF NOT EXISTS saved_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  profile_snapshot_json JSONB NOT NULL,
  storage_key TEXT NOT NULL,
  original_filename TEXT,
  source resume_source_type NOT NULL DEFAULT 'user_provided',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_resumes_user_id
  ON saved_resumes(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_resumes_created_at
  ON saved_resumes(created_at DESC);

ALTER TABLE application_resumes
  ADD COLUMN IF NOT EXISTS saved_resume_id UUID REFERENCES saved_resumes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_application_resumes_saved_resume_id
  ON application_resumes(saved_resume_id);

DROP TRIGGER IF EXISTS set_timestamp_saved_resumes ON saved_resumes;
CREATE TRIGGER set_timestamp_saved_resumes
BEFORE UPDATE ON saved_resumes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
