import { config } from '../config/env.js';
import { stripe } from '../utils/stripe.js';
import { handleStripeEvents } from '../services/subscriptionService.js';

export async function stripeWebhook(req, res) {
  // In mock mode, just log and return 200 so Stripe dashboard (if configured) doesn't break.
  if (config.stripe.mockMode) {
    console.log('[Mock Stripe] Webhook received (ignored in mock mode)');
    return res.json({ received: true, mock: true });
  }

  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      config.stripe.webhookSecret,
    );
  } catch (err) {
    console.error('Webhook signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await handleStripeEvents(event);
    res.json({ received: true });
  } catch (err) {
    console.error('Error handling Stripe event', err);
    res.status(500).json({ message: 'Webhook handler error' });
  }
}

