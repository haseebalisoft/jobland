-- CV/Resume skills are for the resume only; job_functions stay for onboarding/preferences.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS resume_skills TEXT[];
