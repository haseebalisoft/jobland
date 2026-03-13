-- Add support for multiple job types / functions and explicit experience level

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS job_functions TEXT[],
  ADD COLUMN IF NOT EXISTS job_types employment_type[],
  ADD COLUMN IF NOT EXISTS experience_level VARCHAR(50);

