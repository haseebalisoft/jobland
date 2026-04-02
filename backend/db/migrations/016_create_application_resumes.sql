DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resume_source_type') THEN
    CREATE TYPE resume_source_type AS ENUM ('user_provided', 'bd_provided');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS application_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  original_filename TEXT,
  mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  size_bytes INTEGER CHECK (size_bytes >= 0),
  source resume_source_type NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_resumes_application_id
  ON application_resumes(application_id);

CREATE INDEX IF NOT EXISTS idx_application_resumes_uploaded_by
  ON application_resumes(uploaded_by);

CREATE TRIGGER set_timestamp_application_resumes
BEFORE UPDATE ON application_resumes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
