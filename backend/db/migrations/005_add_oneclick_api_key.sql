-- Capture extension: BD API key for submitting jobs from the extension
ALTER TABLE users ADD COLUMN IF NOT EXISTS oneclick_api_key TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_oneclick_api_key ON users(oneclick_api_key) WHERE oneclick_api_key IS NOT NULL;
