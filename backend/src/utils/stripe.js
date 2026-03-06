import Stripe from 'stripe';
import { config } from '../config/env.js';

let stripeClient = null;

export function getStripeClient() {
  if (!config.stripe.secretKey) {
    const err = new Error(
      'Stripe is not configured. Set STRIPE_SECRET_KEY in backend/.env.',
    );
    err.statusCode = 500;
    throw err;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(config.stripe.secretKey, {
      apiVersion: '2024-06-20',
    });
  }

  return stripeClient;
}

