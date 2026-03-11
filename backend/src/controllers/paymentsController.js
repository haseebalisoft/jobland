import { validationResult } from 'express-validator';
import { decodeSignupVerificationToken } from '../services/authService.js';
import { createCheckoutSession } from '../services/subscriptionService.js';

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
      planId,
      email,
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    next(err);
  }
}

