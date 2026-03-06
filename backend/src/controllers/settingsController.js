import { query } from '../config/db.js';
import { updateUserProfile, changePassword } from '../services/authService.js';

async function getLatestSubscription(userId) {
  try {
    const subRes = await query(
      `
        SELECT id, stripe_customer_id, stripe_subscription_id, plan_id, status, current_period_end, created_at
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

export async function getSettings(req, res, next) {
  try {
    const userId = req.user.id;

    const userRes = await query(
      `
        SELECT id, full_name, email, role, is_verified, subscription_plan, is_active, created_at
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

    res.json({
      user: {
        id: user.id,
        full_name: user.full_name,
        name: user.full_name,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        is_active: user.is_active,
        subscription_plan: user.subscription_plan,
        created_at: user.created_at,
      },
      subscription: subscription
        ? {
            id: subscription.id,
            plan_id: subscription.plan_id,
            status: subscription.status,
            current_period_end: subscription.current_period_end,
            created_at: subscription.created_at,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfileSettings(req, res, next) {
  try {
    const { full_name } = req.body;
    const updated = await updateUserProfile(req.user.id, full_name);
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updated.id,
        name: updated.name,
        full_name: updated.full_name,
        email: updated.email,
        role: updated.role,
        emailVerified: updated.emailVerified,
        isActive: updated.isActive,
        subscription_plan: updated.subscription_plan,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function changePasswordController(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    await changePassword(req.user.id, current_password, new_password);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}
