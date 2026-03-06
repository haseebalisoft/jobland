const PLANS = [
  {
    id: 'professional_resume',
    name: 'Professional Resume',
    priceCents: 1500,
    currency: 'usd',
    stripePriceId: process.env.STRIPE_PRICE_PROFESSIONAL_RESUME_ID || 'price_test_professional_resume',
  },
  {
    id: 'starter_pack',
    name: 'Starter Pack',
    priceCents: 3000,
    currency: 'usd',
    stripePriceId: process.env.STRIPE_PRICE_STARTER_PACK_ID || 'price_test_starter_pack',
  },
  {
    id: 'success_pack',
    name: 'Success Pack',
    priceCents: 6000,
    currency: 'usd',
    stripePriceId: process.env.STRIPE_PRICE_SUCCESS_PACK_ID || 'price_test_success_pack',
  },
  {
    id: 'elite_pack',
    name: 'Elite Pack',
    priceCents: 10000,
    currency: 'usd',
    stripePriceId: process.env.STRIPE_PRICE_ELITE_PACK_ID || 'price_test_elite_pack',
  },
];

export async function getPlans(req, res, next) {
  try {
    res.json(PLANS);
  } catch (err) {
    next(err);
  }
}

