import { stripe } from '../utils/stripe.js';
import { query } from '../config/db.js';
import { config } from '../config/env.js';

const PLAN_PRICE_MAP = {
  professional_resume: process.env.STRIPE_PRICE_PROFESSIONAL_RESUME_ID || 'price_test_professional_resume',
  starter_pack: process.env.STRIPE_PRICE_STARTER_PACK_ID || 'price_test_starter_pack',
  success_pack: process.env.STRIPE_PRICE_SUCCESS_PACK_ID || 'price_test_success_pack',
  elite_pack: process.env.STRIPE_PRICE_ELITE_PACK_ID || 'price_test_elite_pack',
};

export async function createCheckoutSession(userId, planId) {
  const priceId = PLAN_PRICE_MAP[planId];
  if (!priceId && !config.stripe.mockMode) {
    const err = new Error('Invalid plan selected');
    err.statusCode = 400;
    throw err;
  }

  const successUrl = `${config.clientUrl.replace(/\/$/, '')}/checkout-success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${config.clientUrl.replace(/\/$/, '')}/pricing`;

  // Mock mode: skip real Stripe calls, immediately "activate" subscription for local testing.
  if (config.stripe.mockMode) {
    console.log('[Mock Stripe] Activating subscription locally for user:', userId, 'plan:', planId);

    await query(
      `
        UPDATE users
        SET subscription_plan = $2,
            is_active = true,
            updated_at = NOW()
        WHERE id = $1
      `,
      [userId, planId],
    );

    return {
      id: `mock_session_${Date.now()}`,
      url: successUrl.replace('{CHECKOUT_SESSION_ID}', `mock_${Date.now()}`),
    };
  }

  console.log('Creating Stripe Checkout session for user:', userId, 'plan:', planId);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      planId,
    },
  });

  console.log('Stripe Checkout session created:', session.id);
  return session;
}

async function upsertSubscription({
  userId,
  customerId,
  subscriptionId,
  planId,
  status,
  currentPeriodEnd,
}) {
  console.log('Upserting subscription record:', {
    userId,
    customerId,
    subscriptionId,
    planId,
    status,
    currentPeriodEnd,
  });

  const existing = await query(
    'SELECT id FROM subscriptions WHERE stripe_subscription_id = $1',
    [subscriptionId],
  );

  if (existing.rowCount > 0) {
    await query(
      `
        UPDATE subscriptions
        SET
          user_id = COALESCE($1, user_id),
          stripe_customer_id = COALESCE($2, stripe_customer_id),
          plan_id = COALESCE($3, plan_id),
          status = COALESCE($4, status),
          current_period_end = COALESCE($5, current_period_end)
        WHERE stripe_subscription_id = $6
      `,
      [userId, customerId, planId, status, currentPeriodEnd, subscriptionId],
    );
  } else {
    await query(
      `
        INSERT INTO subscriptions (
          user_id,
          stripe_customer_id,
          stripe_subscription_id,
          plan_id,
          status,
          current_period_end
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [userId, customerId, subscriptionId, planId, status, currentPeriodEnd],
    );
  }
}

export async function handleStripeEvents(event) {
  console.log('Received Stripe event:', event.type);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, planId } = session.metadata || {};
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      if (!userId || !planId || !customerId || !subscriptionId) {
        console.warn(
          'checkout.session.completed missing required metadata or fields',
          { userId, planId, customerId, subscriptionId },
        );
        return;
      }

      console.log('Handling checkout.session.completed for user:', userId, 'plan:', planId);

      const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
      const currentPeriodEnd = stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000)
        : null;

      await upsertSubscription({
        userId,
        customerId,
        subscriptionId,
        planId,
        status: stripeSub.status || 'active',
        currentPeriodEnd,
      });

      await query(
        `
          UPDATE users
          SET subscription_plan = $2,
              is_active = true,
              updated_at = NOW()
          WHERE id = $1
        `,
        [userId, planId],
      );

      console.log('Subscription activated in PostgreSQL for user:', userId);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const subscriptionId = sub.id;
      const customerId = sub.customer;
      const status = sub.status || null;
      const currentPeriodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null;

      await upsertSubscription({
        userId: null,
        customerId,
        subscriptionId,
        planId: null,
        status,
        currentPeriodEnd,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const subscriptionId = sub.id;

      console.log('Marking subscription as canceled:', subscriptionId);
      await upsertSubscription({
        userId: null,
        customerId: sub.customer,
        subscriptionId,
        planId: null,
        status: 'canceled',
        currentPeriodEnd: null,
      });
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;

      if (!subscriptionId) {
        console.warn('invoice.paid without subscription id');
        return;
      }

      console.log('invoice.paid for subscription:', subscriptionId);

      await upsertSubscription({
        userId: null,
        customerId: invoice.customer,
        subscriptionId,
        planId: null,
        status: 'active',
        currentPeriodEnd: null,
      });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;

      if (!subscriptionId) {
        console.warn('invoice.payment_failed without subscription id');
        return;
      }

      console.log('invoice.payment_failed for subscription:', subscriptionId);

      await upsertSubscription({
        userId: null,
        customerId: invoice.customer,
        subscriptionId,
        planId: null,
        status: 'past_due',
        currentPeriodEnd: null,
      });
      break;
    }

    default:
      console.log('Unhandled Stripe event type:', event.type);
      break;
  }
}

