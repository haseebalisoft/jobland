import { createCheckoutSession } from '../services/subscriptionService.js';
import { query } from '../config/db.js';

export async function createCheckoutSessionController(req, res, next) {
  try {
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ message: 'planId is required' });
    }

    const session = await createCheckoutSession(req.user.id, planId);
    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
}

export async function getMySubscription(req, res, next) {
  try {
    const result = await query(
      `
        SELECT subscription_plan, is_active, is_verified
        FROM users
        WHERE id = $1
      `,
      [req.user.id],
    );

    if (result.rowCount === 0) {
      return res.json(null);
    }

    const row = result.rows[0];
    res.json({
      subscription_plan: row.subscription_plan,
      is_active: row.is_active,
      is_verified: row.is_verified,
    });
  } catch (err) {
    next(err);
  }
}

