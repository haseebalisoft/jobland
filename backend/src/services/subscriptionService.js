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
  starter_pack: {
    id: 'starter_pack',
    name: 'Starter Pack',
    mode: 'payment',
    priceId: process.env.STRIPE_PRICE_STARTER_PACK_ID || 'price_test_starter_pack',
  },
  success_pack: {
    id: 'success_pack',
    name: 'Success Pack',
    mode: 'payment',
    priceId: process.env.STRIPE_PRICE_SUCCESS_PACK_ID || 'price_test_success_pack',
  },
  elite_pack: {
    id: 'elite_pack',
    name: 'Elite Pack',
    mode: 'payment',
    priceId: process.env.STRIPE_PRICE_ELITE_PACK_ID || 'price_test_elite_pack',
  },
};

let subscriptionsTableEnsured = false;

function getPlanConfig(planId) {
  const plan = PLAN_CONFIG[planId];
  if (!plan) {
    const err = new Error(
      'Invalid plan selected. Use one of: professional_resume, starter_pack, success_pack, elite_pack',
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

  return localPart || 'JobLand User';
}

function queuePasswordSetupEmail(userId) {
  setImmediate(() => {
    sendPasswordSetupEmail({ userId }).catch((err) => {
      console.error('Failed to send password setup email:', err?.message || err);
    });
  });
}

async function ensureSubscriptionsTable() {
  if (subscriptionsTableEnsured) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT UNIQUE,
      stripe_checkout_session_id TEXT UNIQUE,
      plan_id VARCHAR(100),
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

async function getLatestSubscription(userId) {
  try {
    await ensureSubscriptionsTable();
    const result = await query(
      `
        SELECT id,
               stripe_customer_id,
               stripe_subscription_id,
               stripe_checkout_session_id,
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

    return result.rows[0] || null;
  } catch (err) {
    if (err?.code === '42P01') {
      return null;
    }
    throw err;
  }
}

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

  const execute = client ? client.query.bind(client) : query;
  const lookupResult = subscriptionId
    ? await execute('SELECT id FROM subscriptions WHERE stripe_subscription_id = $1', [
        subscriptionId,
      ])
    : await execute('SELECT id FROM subscriptions WHERE stripe_checkout_session_id = $1', [
        checkoutSessionId,
      ]);

  if (lookupResult.rowCount > 0) {
    await execute(
      `
        UPDATE subscriptions
        SET user_id = COALESCE($1, user_id),
            stripe_customer_id = COALESCE($2, stripe_customer_id),
            stripe_subscription_id = COALESCE($3, stripe_subscription_id),
            stripe_checkout_session_id = COALESCE($4, stripe_checkout_session_id),
            plan_id = COALESCE($5, plan_id),
            status = COALESCE($6, status),
            current_period_end = $7,
            updated_at = NOW()
        WHERE id = $8
      `,
      [
        userId,
        customerId,
        subscriptionId,
        checkoutSessionId,
        planId,
        status,
        currentPeriodEnd,
        lookupResult.rows[0].id,
      ],
    );
    return;
  }

  await execute(
    `
      INSERT INTO subscriptions (
        user_id,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_checkout_session_id,
        plan_id,
        status,
        current_period_end
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      userId,
      customerId,
      subscriptionId,
      checkoutSessionId,
      planId,
      status,
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
    fullName: session.customer_details?.name || null,
    planId,
    customerId:
      (typeof session.customer === 'string' ? session.customer : null) ||
      (typeof subscription?.customer === 'string' ? subscription.customer : null),
    subscriptionId: subscription?.id || null,
    checkoutSessionId: session.id,
    status:
      subscription?.status ||
      (session.mode === 'payment' ? 'paid' : session.payment_status || 'active'),
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

  if (userId) {
    const user = await getCheckoutUser(userId);
    if (!user.is_verified) {
      const err = new Error('Please verify your email before starting checkout');
      err.statusCode = 403;
      throw err;
    }
    customerEmail = user.email;
  } else if (email) {
    customerEmail = String(email).trim().toLowerCase();
  }

  const clientBaseUrl = config.clientUrl.replace(/\/$/, '');
  const successUrl = `${clientBaseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
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
    ...(userId ? { client_reference_id: userId } : {}),
    ...(customerEmail ? { customer_email: customerEmail } : {}),
    customer_creation: 'always',
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

  await query(
    `
      INSERT INTO subscriptions (
        stripe_customer_id,
        stripe_subscription_id,
        status,
        current_period_end
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (stripe_subscription_id)
      DO UPDATE SET stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
                    status = COALESCE(EXCLUDED.status, subscriptions.status),
                    current_period_end = EXCLUDED.current_period_end,
                    updated_at = NOW()
    `,
    [customerId, subscriptionId, status, currentPeriodEnd],
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

