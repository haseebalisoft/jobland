import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool, { query } from '../config/db.js';
import { config } from '../config/env.js';
import { getStripeClient } from '../utils/stripe.js';
import { sendPasswordSetupEmail } from './authService.js';

const PLAN_CONFIG = {
  professional_resume: {
    id: 'professional_resume',
    name: 'Professional Resume',
    mode: 'payment',
    priceId:
      process.env.STRIPE_PRICE_PROFESSIONAL_RESUME_ID ||
      'price_test_professional_resume',
  },
  starter: {
    id: 'starter',
    name: 'Starter Pack',
    // One-time Checkout: Stripe Price must be one-time (not recurring monthly).
    mode: 'payment',
    priceId:
      process.env.STRIPE_PRICE_STARTER_ID ||
      process.env.STRIPE_PRICE_STARTER_PACK_ID ||
      'price_test_starter',
  },
  success: {
    id: 'success',
    name: 'Success Pack',
    mode: 'payment',
    priceId:
      process.env.STRIPE_PRICE_SUCCESS_ID ||
      process.env.STRIPE_PRICE_SUCCESS_PACK_ID ||
      'price_test_success',
  },
  elite: {
    id: 'elite',
    name: 'Elite Pack',
    mode: 'payment',
    priceId:
      process.env.STRIPE_PRICE_ELITE_ID ||
      process.env.STRIPE_PRICE_ELITE_PACK_ID ||
      'price_test_elite',
  },
};

let subscriptionsTableEnsured = false;
let usersStripeColumnEnsured = false;

function normalizeSubscriptionStatus(status) {
  const normalized = String(status || '').toLowerCase().trim();
  if (normalized === 'trialing') return 'trialing';
  if (normalized === 'past_due') return 'past_due';
  if (normalized === 'canceled' || normalized === 'cancelled') return 'canceled';
  // Stripe checkout for one-time payments may produce "paid" at session level.
  // Our DB enum only allows active/trialing/canceled/past_due.
  if (normalized === 'paid') return 'active';
  return 'active';
}

async function ensureUsersStripeCustomerIdColumn() {
  if (usersStripeColumnEnsured) return;
  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT
  `);
  usersStripeColumnEnsured = true;
}

function getPlanConfig(planId) {
  const plan = PLAN_CONFIG[planId];
  if (!plan) {
    const err = new Error(
      'Invalid plan selected. Use one of: professional_resume, starter, success, elite',
    );
    err.statusCode = 400;
    throw err;
  }

  if (!plan.priceId) {
    const err = new Error(
      `Stripe price is not configured for ${plan.name}. Set the matching STRIPE_PRICE_* env variable.`,
    );
    err.statusCode = 500;
    throw err;
  }

  return plan;
}

function deriveFullName(fullName, email) {
  const trimmed = String(fullName || '').trim();
  if (trimmed) {
    return trimmed;
  }

  const localPart = String(email || '')
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return localPart || 'HiredLogics User';
}

function queuePasswordSetupEmail(userId) {
  setImmediate(() => {
    sendPasswordSetupEmail({ userId }).catch((err) => {
      console.error('Failed to send password setup email:', err?.message || err);
    });
  });
}

// When using 001_initial.sql (hiredlogics_prod), subscriptions already has subscription_plan_id, subscription_status enum.
async function ensureSubscriptionsTable() {
  if (subscriptionsTableEnsured) {
    return;
  }
  try {
    const check = await query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'subscription_plan_id'
    `);
    if (check.rowCount > 0) {
      subscriptionsTableEnsured = true;
      return;
    }
  } catch (_) {}
  await query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subscription_plan_id UUID REFERENCES subscription_plans(id) ON DELETE RESTRICT,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT UNIQUE,
      stripe_checkout_session_id TEXT UNIQUE,
      status VARCHAR(50),
      current_period_end TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  subscriptionsTableEnsured = true;
}

async function getCheckoutUser(userId) {
  const result = await query(
    `
      SELECT id, full_name, email, is_verified
      FROM users
      WHERE id = $1
    `,
    [userId],
  );

  if (result.rowCount === 0) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
}

async function getUserSnapshot(userId) {
  const result = await query(
    `
      SELECT id, full_name, email, role, is_verified, subscription_plan, is_active
      FROM users
      WHERE id = $1
    `,
    [userId],
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    _id: row.id,
    name: row.full_name,
    full_name: row.full_name,
    email: row.email,
    role: row.role || 'user',
    emailVerified: row.is_verified === true,
    isActive: row.is_active === true,
    subscription_plan: row.subscription_plan,
  };
}

// 001_initial: subscriptions has subscription_plan_id (FK); plan_id lives on subscription_plans.plan_id
async function getLatestSubscription(userId) {
  try {
    await ensureSubscriptionsTable();
    const result = await query(
      `
        SELECT s.id,
               s.stripe_customer_id,
               s.stripe_subscription_id,
               s.stripe_checkout_session_id,
               s.status,
               s.current_period_end,
               s.created_at,
               sp.plan_id
        FROM subscriptions s
        LEFT JOIN subscription_plans sp ON sp.id = s.subscription_plan_id
        WHERE s.user_id = $1
        ORDER BY s.created_at DESC
        LIMIT 1
      `,
      [userId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return { ...row, plan_id: row.plan_id ?? null };
  } catch (err) {
    if (err?.code === '42P01') {
      return null;
    }
    throw err;
  }
}

// 001_initial: subscriptions uses subscription_plan_id (FK to subscription_plans), not plan_id
async function upsertSubscriptionRecord({
  userId,
  customerId = null,
  subscriptionId = null,
  checkoutSessionId = null,
  planId = null,
  status = null,
  currentPeriodEnd = null,
  client = null,
}) {
  if (!subscriptionId && !checkoutSessionId) {
    return;
  }

  await ensureSubscriptionsTable();
  const safeStatus = normalizeSubscriptionStatus(status);

  const execute = client ? client.query.bind(client) : query;
  let subscriptionPlanId = null;
  if (planId) {
    const planRes = await execute(
      'SELECT id FROM subscription_plans WHERE plan_id = $1 LIMIT 1',
      [planId],
    );
    subscriptionPlanId = planRes.rows[0]?.id ?? null;
  }

  const lookupResult = subscriptionId
    ? await execute('SELECT id, subscription_plan_id FROM subscriptions WHERE stripe_subscription_id = $1', [
        subscriptionId,
      ])
    : await execute('SELECT id, subscription_plan_id FROM subscriptions WHERE stripe_checkout_session_id = $1', [
        checkoutSessionId,
      ]);

  if (lookupResult.rowCount > 0) {
    const existingPlanId = lookupResult.rows[0].subscription_plan_id;
    await execute(
      `
        UPDATE subscriptions
        SET user_id = COALESCE($1, user_id),
            stripe_customer_id = COALESCE($2, stripe_customer_id),
            stripe_subscription_id = COALESCE($3, stripe_subscription_id),
            stripe_checkout_session_id = COALESCE($4, stripe_checkout_session_id),
            subscription_plan_id = COALESCE($5, subscription_plan_id),
            status = COALESCE($6::subscription_status, status),
            current_period_end = $7,
            updated_at = NOW()
        WHERE id = $8
      `,
      [
        userId,
        customerId,
        subscriptionId,
        checkoutSessionId,
        subscriptionPlanId ?? existingPlanId,
        safeStatus,
        currentPeriodEnd,
        lookupResult.rows[0].id,
      ],
    );
    return;
  }

  // 001: subscription_plan_id is NOT NULL; skip INSERT if we have no plan
  if (!subscriptionPlanId) {
    return;
  }
  await execute(
    `
      INSERT INTO subscriptions (
        user_id,
        subscription_plan_id,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_checkout_session_id,
        status,
        current_period_end
      )
      VALUES ($1, $2, $3, $4, $5, $6::subscription_status, $7)
    `,
    [
      userId,
      subscriptionPlanId,
      customerId,
      subscriptionId,
      checkoutSessionId,
      safeStatus,
      currentPeriodEnd,
    ],
  );
}

async function activatePlanForUser({
  userId,
  planId,
  customerId = null,
  subscriptionId = null,
  checkoutSessionId = null,
  status = 'active',
  currentPeriodEnd = null,
  client = null,
}) {
  const execute = client ? client.query.bind(client) : query;

  await execute(
    `
      UPDATE users
      SET subscription_plan = $2,
          stripe_customer_id = COALESCE($3, stripe_customer_id),
          is_verified = true,
          is_active = true,
          updated_at = NOW()
      WHERE id = $1
    `,
    [userId, planId, customerId],
  );

  await upsertSubscriptionRecord({
    userId,
    customerId,
    subscriptionId,
    checkoutSessionId,
    planId,
    status,
    currentPeriodEnd,
    client,
  });
}

async function createStripeProvisionedUser({
  email,
  fullName,
  planId,
  customerId,
  client,
}) {
  const execute = client.query.bind(client);
  const temporaryPassword = crypto.randomBytes(24).toString('base64url');
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const insertRes = await execute(
    `
      INSERT INTO users (
        full_name,
        email,
        password_hash,
        role,
        is_verified,
        subscription_plan,
        stripe_customer_id,
        is_active
      )
      VALUES ($1, $2, $3, 'user', true, $4, $5, true)
      RETURNING id
    `,
    [deriveFullName(fullName, email), email.toLowerCase(), passwordHash, planId, customerId],
  );

  return insertRes.rows[0];
}

async function findUserByEmail(email, client = null) {
  const execute = client ? client.query.bind(client) : query;
  const result = await execute(
    `
      SELECT id, email, is_verified, is_active
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [email],
  );

  return result.rows[0] || null;
}

async function upsertUserFromCompletedCheckout({
  email,
  fullName,
  planId,
  customerId = null,
  subscriptionId = null,
  checkoutSessionId = null,
  status = 'active',
  currentPeriodEnd = null,
}) {
  await ensureUsersStripeCustomerIdColumn();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let user = await findUserByEmail(email, client);
    let accountCreated = false;

    if (!user) {
      user = await createStripeProvisionedUser({
        email,
        fullName,
        planId,
        customerId,
        client,
      });
      accountCreated = true;
    }

    await activatePlanForUser({
      userId: user.id,
      planId,
      customerId,
      subscriptionId,
      checkoutSessionId,
      status,
      currentPeriodEnd,
      client,
    });

    await client.query('COMMIT');

    if (accountCreated) {
      queuePasswordSetupEmail(user.id);
    }

    return { userId: user.id, accountCreated };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getCheckoutActivationData(session) {
  const planId = session.metadata?.planId;
  if (!planId) {
    const err = new Error('Stripe session is missing plan metadata');
    err.statusCode = 400;
    throw err;
  }

  const isPaid = session.payment_status === 'paid' || session.status === 'complete';
  if (!isPaid) {
    const err = new Error('Payment has not completed yet');
    err.statusCode = 409;
    throw err;
  }

  let subscription = null;
  if (session.subscription) {
    subscription =
      typeof session.subscription === 'string'
        ? await getStripeClient().subscriptions.retrieve(session.subscription)
        : session.subscription;
  }

  const email =
    session.customer_details?.email ||
    session.customer_email ||
    session.customer_details?.address?.email ||
    null;

  if (!email) {
    const err = new Error('Stripe session is missing customer email');
    err.statusCode = 400;
    throw err;
  }

  return {
    email: email.toLowerCase(),
    fullName: null,
    planId,
    customerId:
      (typeof session.customer === 'string' ? session.customer : null) ||
      (typeof subscription?.customer === 'string' ? subscription.customer : null),
    subscriptionId: subscription?.id || null,
    checkoutSessionId: session.id,
    status: normalizeSubscriptionStatus(
      subscription?.status || (session.mode === 'payment' ? 'paid' : session.payment_status),
    ),
    currentPeriodEnd: subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null,
  };
}

async function finalizeCheckoutSession(session) {
  const activation = await getCheckoutActivationData(session);
  const result = await upsertUserFromCompletedCheckout(activation);

  return {
    user: await getUserSnapshot(result.userId),
    subscription: await getLatestSubscription(result.userId),
    planId: activation.planId,
    sessionId: activation.checkoutSessionId,
    accountCreated: result.accountCreated,
  };
}

export async function createCheckoutSession({ userId = null, planId, email = null }) {
  const plan = getPlanConfig(planId);
  let customerEmail = null;

  // Use explicitly provided email first (so user can enter a different email at checkout)
  if (email && String(email).trim()) {
    customerEmail = String(email).trim().toLowerCase();
  } else if (userId) {
    const user = await getCheckoutUser(userId);
    if (!user.is_verified) {
      const err = new Error('Please verify your email before starting checkout');
      err.statusCode = 403;
      throw err;
    }
    customerEmail = user.email;
  }

  const clientBaseUrl = config.clientUrl.replace(/\/$/, '');
  // Authenticated buyers should land on checkout-success/dashboard flow.
  // Guest buyers should land on set-password to finish onboarding.
  const successUrl = userId
    ? `${clientBaseUrl}/checkout-success?session_id={CHECKOUT_SESSION_ID}`
    : `${clientBaseUrl}/set-password?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${clientBaseUrl}/checkout?plan=${encodeURIComponent(plan.name)}`;

  if (config.stripe.mockMode) {
    const mockSessionId = `mock_session_${Date.now()}`;
    await finalizeCheckoutSession({
      id: mockSessionId,
      mode: plan.mode,
      status: 'complete',
      payment_status: 'paid',
      customer: customerEmail ? `mock_customer_${Date.now()}` : null,
      customer_email: customerEmail,
      customer_details: {
        email: customerEmail || `guest_${Date.now()}@example.com`,
        name: null,
      },
      metadata: {
        ...(userId ? { userId } : {}),
        planId: plan.id,
        planName: plan.name,
      },
    });

    return {
      id: mockSessionId,
      url: successUrl.replace('{CHECKOUT_SESSION_ID}', mockSessionId),
    };
  }

  const session = await getStripeClient().checkout.sessions.create({
    mode: plan.mode,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Limit to card payments; Stripe Link UI may still appear
    // when a customer has Link saved, but they can always choose
    // "Pay without Link" to go straight to card entry.
    payment_method_types: ['card'],
    ...(userId ? { client_reference_id: userId } : {}),
    ...(customerEmail ? { customer_email: customerEmail } : {}),
    // customer_creation is only allowed in payment mode (one-time), not subscription mode
    ...(plan.mode === 'payment' ? { customer_creation: 'always' } : {}),
    billing_address_collection: 'auto',
    metadata: {
      ...(userId ? { userId } : {}),
      planId: plan.id,
      planName: plan.name,
    },
  });

  return session;
}

export async function confirmCheckoutSession(userId, sessionId) {
  if (!sessionId) {
    const err = new Error('Stripe checkout session id is required');
    err.statusCode = 400;
    throw err;
  }

  if (config.stripe.mockMode) {
    const user = await getUserSnapshot(userId);
    return {
      user,
      subscription: await getLatestSubscription(userId),
      planId: user?.subscription_plan || null,
      sessionId,
    };
  }

  const [session, user] = await Promise.all([
    getStripeClient().checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    }),
    getUserSnapshot(userId),
  ]);

  const sessionUserId = session.metadata?.userId || session.client_reference_id;
  const sessionEmail =
    session.customer_details?.email || session.customer_email || null;

  if (sessionUserId) {
    if (sessionUserId !== userId) {
      const err = new Error('This payment session does not belong to the current user');
      err.statusCode = 403;
      throw err;
    }
  } else if (!user || !sessionEmail || user.email.toLowerCase() !== sessionEmail.toLowerCase()) {
    const err = new Error('This payment session does not belong to the current user');
    err.statusCode = 403;
    throw err;
  }

  return finalizeCheckoutSession(session);
}

/**
 * Get or create user from checkout session (no auth required).
 * Used when user lands on set-password with session_id: we ensure the account
 * exists (creating it from Stripe session if needed) then caller can set password.
 */
export async function getOrCreateUserFromCheckoutSession(sessionId) {
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
    const err = new Error('Checkout session ID is required');
    err.statusCode = 400;
    throw err;
  }

  if (config.stripe.mockMode) {
    await ensureSubscriptionsTable();
    const row = await query(
      `SELECT user_id FROM subscriptions WHERE stripe_checkout_session_id = $1 LIMIT 1`,
      [sessionId.trim()],
    );
    if (row.rowCount === 0) {
      const err = new Error('Session not found. Complete checkout first.');
      err.statusCode = 400;
      throw err;
    }
    const user = await getUserSnapshot(row.rows[0].user_id);
    if (!user) {
      const err = new Error('Account not found for this session.');
      err.statusCode = 400;
      throw err;
    }
    return user;
  }

  const session = await getStripeClient().checkout.sessions.retrieve(sessionId.trim(), {
    expand: ['subscription'],
  });
  const result = await finalizeCheckoutSession(session);
  return result.user;
}

// 001_initial: subscriptions has user_id and subscription_plan_id NOT NULL; only UPDATE by stripe_subscription_id
async function updateSubscriptionStatus({
  customerId,
  subscriptionId,
  status,
  currentPeriodEnd,
}) {
  if (!subscriptionId) {
    return;
  }

  await ensureSubscriptionsTable();

  const normalizedStatus = normalizeSubscriptionStatus(status);
  await query(
    `
      UPDATE subscriptions
      SET stripe_customer_id = COALESCE($1, stripe_customer_id),
          status = $2::subscription_status,
          current_period_end = COALESCE($3, current_period_end),
          updated_at = NOW()
      WHERE stripe_subscription_id = $4
    `,
    [customerId, normalizedStatus, currentPeriodEnd, subscriptionId],
  );
}

export async function handleStripeEvents(event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await finalizeCheckoutSession(event.data.object);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      await updateSubscriptionStatus({
        customerId: sub.customer,
        subscriptionId: sub.id,
        status: sub.status || null,
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await updateSubscriptionStatus({
        customerId: sub.customer,
        subscriptionId: sub.id,
        status: 'canceled',
        currentPeriodEnd: null,
      });
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      await updateSubscriptionStatus({
        customerId: invoice.customer,
        subscriptionId: invoice.subscription,
        status: 'active',
        currentPeriodEnd: null,
      });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      await updateSubscriptionStatus({
        customerId: invoice.customer,
        subscriptionId: invoice.subscription,
        status: 'past_due',
        currentPeriodEnd: null,
      });
      break;
    }

    default:
      break;
  }
}

/**
 * User opts out of paid subscription: Stripe recurring subs are canceled (best effort),
 * local subscription rows marked canceled, user set to free + active. No new subscription row.
 */
export async function optOutToFreeTier(userId) {
  if (!userId) {
    const err = new Error('User ID is required');
    err.statusCode = 400;
    throw err;
  }

  const userRes = await query(
    `
      SELECT id, role, is_verified
      FROM users
      WHERE id = $1
    `,
    [userId],
  );

  if (userRes.rowCount === 0) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const row = userRes.rows[0];
  if (row.role && row.role !== 'user') {
    const err = new Error('Only customer accounts can use this action');
    err.statusCode = 403;
    throw err;
  }
  if (!row.is_verified) {
    const err = new Error('Please verify your email first');
    err.statusCode = 403;
    throw err;
  }

  await ensureSubscriptionsTable();
  let canceledSubscriptions = 0;
  let stripeCancellationFailures = 0;

  if (!config.stripe.mockMode) {
    try {
      const stripe = getStripeClient();
      const subRows = await query(
        `
          SELECT stripe_subscription_id
          FROM subscriptions
          WHERE user_id = $1
            AND stripe_subscription_id IS NOT NULL
            AND status IN ('active', 'trialing', 'past_due')
        `,
        [userId],
      );
      for (const s of subRows.rows) {
        try {
          await stripe.subscriptions.cancel(s.stripe_subscription_id);
          canceledSubscriptions += 1;
        } catch (e) {
          stripeCancellationFailures += 1;
          console.error('optOutToFreeTier: Stripe cancel failed', e?.message || e);
        }
      }
    } catch (e) {
      if (e?.statusCode === 500) {
        console.warn('optOutToFreeTier: Stripe unavailable, skipping remote cancel');
      } else {
        throw e;
      }
    }
  }

  await query(
    `
      UPDATE subscriptions
      SET status = 'canceled',
          updated_at = NOW()
      WHERE user_id = $1
        AND status IN ('active', 'trialing', 'past_due')
    `,
    [userId],
  );

  await query(
    `
      UPDATE users
      SET subscription_plan = 'free',
          is_active = true,
          updated_at = NOW()
      WHERE id = $1
    `,
    [userId],
  );

  const user = await getUserSnapshot(userId);
  const alreadyOnFree = user?.subscription_plan === 'free' && canceledSubscriptions === 0;
  return {
    user,
    canceledSubscriptions,
    stripeCancellationFailures,
    alreadyOnFree,
  };
}

