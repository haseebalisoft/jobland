-- Add timezone to interviews so users know the correct interview time.

ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_interviews_timezone ON interviews(timezone);

