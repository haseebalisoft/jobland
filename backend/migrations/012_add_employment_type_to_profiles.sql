-- Ensure profiles has employment_type column for new onboarding logic

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS employment_type employment_type;

