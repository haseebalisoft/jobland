CREATE TABLE IF NOT EXISTS user_linkedin_oauth (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  profile_name TEXT,
  linkedin_sub TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_timestamp_user_linkedin_oauth ON user_linkedin_oauth;
CREATE TRIGGER set_timestamp_user_linkedin_oauth
BEFORE UPDATE ON user_linkedin_oauth
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
