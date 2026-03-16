-- Optional indexes to speed up admin analytics queries (date-range filters and GROUP BY date).
-- Existing indexes in 001_initial: idx_applications_created_at, idx_job_assignments_*, idx_subscriptions_user_id, idx_subscriptions_status.

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_job_assignments_created_at ON job_assignments(created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions(created_at);
