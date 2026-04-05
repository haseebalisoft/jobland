-- Optional: dedicated column for evaluation JSON (app stores full payload in scores._evaluation).
-- Safe to run; not required for report generation.
ALTER TABLE interview_reports
ADD COLUMN IF NOT EXISTS evaluation JSONB;
