-- Interviews table: stores interview details linked to applications and (optionally) job_assignments.

CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  job_assignment_id UUID REFERENCES job_assignments(id) ON DELETE SET NULL,

  mode VARCHAR(50), -- e.g. 'meet', 'zoom', 'call', 'onsite', 'other'
  interview_date DATE,
  interview_time TIME,
  duration_minutes INTEGER,
  link TEXT,
  notes TEXT,

  created_by UUID REFERENCES users(id),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_application_id ON interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_job_assignment_id ON interviews(job_assignment_id);

