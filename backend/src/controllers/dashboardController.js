import { query } from '../config/db.js';

// 001_initial: subscriptions has subscription_plan_id (FK to subscription_plans); plan_id lives on subscription_plans
async function getLatestSubscription(userId) {
  try {
    const subRes = await query(
      `
        SELECT s.stripe_customer_id,
               s.stripe_subscription_id,
               s.status,
               s.current_period_end,
               s.created_at,
               sp.plan_id,
               sp.name AS plan_name
        FROM subscriptions s
        LEFT JOIN subscription_plans sp ON sp.id = s.subscription_plan_id
        WHERE s.user_id = $1
        ORDER BY s.created_at DESC
        LIMIT 1
      `,
      [userId],
    );

    return subRes.rows[0] || null;
  } catch (err) {
    if (err?.code === '42P01') {
      return null;
    }
    throw err;
  }
}

export async function getDashboardSummary(req, res, next) {
  try {
    const userId = req.user.id;

    const userRes = await query(
      `
        SELECT u.id, u.full_name, u.email, u.role, u.subscription_plan, u.is_active,
               sp.name AS subscription_plan_name
        FROM users u
        LEFT JOIN subscription_plans sp ON sp.plan_id = u.subscription_plan
        WHERE u.id = $1
      `,
      [userId],
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userRes.rows[0];

    const subscription = await getLatestSubscription(userId);

    // applications.current_status: application_status enum in 001 (applied, interview, acceptance, rejection, withdrawn)
    const appsRes = await query(
      `
        SELECT
          COUNT(*)::int AS total_applications,
          COALESCE(SUM(CASE WHEN current_status = 'interview' THEN 1 ELSE 0 END), 0)::int AS total_interviews
        FROM applications
        WHERE user_id = $1
      `,
      [userId],
    );

    const statsRow = appsRes.rows[0] || {
      total_applications: 0,
      total_interviews: 0,
    };

    const profileRes = await query(
      `
        SELECT id,
               title,
               employment_type,
               experience_years,
               preferred_country,
               preferred_city
        FROM profiles
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [userId],
    );

    const profile = profileRes.rows[0] || null;

    res.json({
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        subscription_plan: user.subscription_plan,
        subscription_plan_name: user.subscription_plan_name || null,
        is_active: user.is_active,
      },
      subscription,
      stats: statsRow,
      profile,
    });
  } catch (err) {
    next(err);
  }
}

