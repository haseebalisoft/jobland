import { validationResult } from 'express-validator';
import { decodeSignupVerificationToken } from '../services/authService.js';
import { createCheckoutSession } from '../services/subscriptionService.js';

const PLAN_NAME_TO_ID = {
  'professional resume': 'professional_resume',
  'starter pack': 'starter',
  'starter': 'starter',
  'success pack': 'success',
  'success': 'success',
  'elite pack': 'elite',
  'elite': 'elite',
};

function normalizePlanId(planId) {
  if (!planId || (typeof planId === 'string' && !planId.trim())) return 'success';
  const key = String(planId).toLowerCase().trim().replace(/_pack$/, '').replace(/\s+/g, ' ');
  return PLAN_NAME_TO_ID[key] || key;
}

export async function createCheckoutSessionForVerifiedEmail(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { verificationToken, planId } = req.body;

    const email = decodeSignupVerificationToken(verificationToken);

    const session = await createCheckoutSession({
      userId: null,
      planId: normalizePlanId(planId),
      email,
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    next(err);
  }
}

