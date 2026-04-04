-- Onboarding / dashboard step state (Careerflow-style home)
CREATE TABLE IF NOT EXISTS user_dashboard_progress (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_step VARCHAR(64) NOT NULL DEFAULT 'application_materials',
  item_states JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_dashboard_progress_updated
  ON user_dashboard_progress(updated_at DESC);
