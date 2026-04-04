-- User documents (Application Materials) and AI cover letters
-- cover_letters first (user_documents may reference cover letter id in app layer)

CREATE TABLE IF NOT EXISTS cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_title VARCHAR(500) NOT NULL,
  company_name VARCHAR(500) NOT NULL,
  job_description TEXT,
  content TEXT NOT NULL DEFAULT '',
  preview TEXT,
  profile_mode VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cover_letters_user ON cover_letters(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT,
  file_name VARCHAR(500) NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type VARCHAR(255),
  file_size BIGINT,
  kind VARCHAR(20),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  source_cover_letter_id UUID REFERENCES cover_letters(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user ON user_documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_documents_category ON user_documents(user_id, category);

ALTER TABLE user_linkedin_oauth ADD COLUMN IF NOT EXISTS profile_cache JSONB;

DROP TRIGGER IF EXISTS set_timestamp_user_documents ON user_documents;
CREATE TRIGGER set_timestamp_user_documents
BEFORE UPDATE ON user_documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
