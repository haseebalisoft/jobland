import { query } from '../config/db.js';

async function getLatestSubscription(userId) {
  try {
    const subRes = await query(
      `
        SELECT stripe_customer_id,
               stripe_subscription_id,
               plan_id,
               status,
               current_period_end,
               created_at
        FROM subscriptions
        WHERE user_id = $1
        ORDER BY created_at DESC
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
        SELECT id, full_name, email, role, subscription_plan, is_active
        FROM users
        WHERE id = $1
      `,
      [userId],
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userRes.rows[0];

    const subscription = await getLatestSubscription(userId);

    const appsRes = await query(
      `
        SELECT
          COUNT(*)::int AS total_applications,
          COALESCE(SUM(CASE WHEN current_status = 'interview' OR current_status = 'interview_scheduled' THEN 1 ELSE 0 END), 0)::int AS total_interviews
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

