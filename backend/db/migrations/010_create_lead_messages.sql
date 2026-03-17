-- Lead ↔ BD messages for a specific job assignment (lead).
-- Enables user–BD communication, e.g. interview rescheduling help.

CREATE TABLE IF NOT EXISTS lead_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  job_assignment_id UUID NOT NULL REFERENCES job_assignments(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role user_role NOT NULL,

  message TEXT NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_messages_job_assignment_id_created_at
  ON lead_messages(job_assignment_id, created_at);

CREATE INDEX IF NOT EXISTS idx_lead_messages_sender_id_created_at
  ON lead_messages(sender_id, created_at);

