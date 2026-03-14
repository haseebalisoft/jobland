import { query } from '../config/db.js';

/**
 * Fetch paid subscription plans from DB (exclude 'free').
 * Returns the last 4 plans: professional_resume, starter, success, elite.
 */
export async function getPlans(req, res, next) {
  try {
    const result = await query(
      `SELECT plan_id, name, price, currency, billing_interval, description
       FROM subscription_plans
       WHERE plan_id != 'free' AND (is_active IS NULL OR is_active = true)
       ORDER BY price ASC`
    );

    const plans = (result.rows || []).map((row) => ({
      plan_id: row.plan_id,
      name: row.name,
      price: Number(row.price),
      currency: row.currency || 'USD',
      billing_interval: row.billing_interval || 'monthly',
      description: row.description || '',
    }));

    res.json(plans);
  } catch (err) {
    next(err);
  }
}
