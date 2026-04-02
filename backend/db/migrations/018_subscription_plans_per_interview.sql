-- Pack plans are sold as one-time (per interview) checkout, not monthly subscriptions.
UPDATE subscription_plans
SET billing_interval = 'per_interview',
    updated_at = NOW()
WHERE plan_id IN ('starter', 'success', 'elite');
