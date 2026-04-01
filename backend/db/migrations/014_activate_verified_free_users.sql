UPDATE users
SET is_active = true,
    updated_at = NOW()
WHERE role = 'user'
  AND is_verified = true
  AND subscription_plan = 'free'
  AND is_active = false;

