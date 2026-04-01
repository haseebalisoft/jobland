import {
  confirmCheckoutSession,
  createCheckoutSession,
  optOutToFreeTier,
} from '../services/subscriptionService.js';
import { query } from '../config/db.js';

const PLAN_NAME_TO_ID = {
  'professional resume': 'professional_resume',
  'starter pack': 'starter',
  'success pack': 'success',
  'elite pack': 'elite',
};

function normalizePlanId(planId) {
  if (!planId || (typeof planId === 'string' && !planId.trim())) return 'success';
  const key = String(planId).toLowerCase().trim().replace(/_pack$/, '');
  return PLAN_NAME_TO_ID[key] || key;
}

export async function createCheckoutSessionController(req, res, next) {
  try {
    const requestedPlanId = req.body.plan_id || req.body.planId;
    const normalized = normalizePlanId(requestedPlanId);

    const session = await createCheckoutSession({
      userId: req.user?.id || null,
      planId: normalized,
      email: req.body.email || null,
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    next(err);
  }
}

export async function createCheckoutSessionAuthController(req, res, next) {
  try {
    const requestedPlanId = req.body.plan_id || req.body.planId;
    const normalized = normalizePlanId(requestedPlanId);

    const session = await createCheckoutSession({
      userId: req.user.id,
      planId: normalized,
      // Force account-bound checkout for authenticated users.
      email: null,
    });
    res.json({ url: session.url, sessionId: session.id });
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

export async function confirmCheckoutSessionController(req, res, next) {
  try {
    const sessionId = req.params.sessionId || req.query.session_id;
    const result = await confirmCheckoutSession(req.user.id, sessionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function optOutToFreeController(req, res, next) {
  try {
    const result = await optOutToFreeTier(req.user.id);
    const snapshot = result?.user;
    if (!snapshot) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      user: {
        id: snapshot._id,
        name: snapshot.name,
        email: snapshot.email,
        role: snapshot.role,
        emailVerified: snapshot.emailVerified,
        isActive: snapshot.isActive,
        subscription_plan: snapshot.subscription_plan,
      },
      canceled_subscriptions: result.canceledSubscriptions || 0,
      stripe_cancellation_failures: result.stripeCancellationFailures || 0,
      already_on_free: result.alreadyOnFree === true,
      message:
        result.alreadyOnFree === true
          ? 'You are already on the free plan.'
          : 'Subscription canceled and account moved to free plan.',
    });
  } catch (err) {
    next(err);
  }
}

