-- When 001_initial.sql was skipped (DB already had users) but profiles predates full schema,
-- ensure columns and enums the API expects. Safe to run multiple times.

DO $$ BEGIN
  CREATE TYPE employment_type AS ENUM (
    'full_time',
    'contract',
    'part_time',
    'internship'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE remote_type AS ENUM (
    'remote_only',
    'onsite_only',
    'hybrid',
    'remote_or_onsite'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS experience_level VARCHAR(50);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS job_functions TEXT[];

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS job_types employment_type[];

CREATE INDEX IF NOT EXISTS idx_profiles_job_functions_gin ON profiles USING GIN (job_functions);
CREATE INDEX IF NOT EXISTS idx_profiles_job_types_gin ON profiles USING GIN (job_types);
