import express from 'express';
import { body } from 'express-validator';
import { createCheckoutSessionForVerifiedEmail } from '../controllers/paymentsController.js';

const router = express.Router();

router.post(
  '/create-checkout-session',
  [
    body('verificationToken')
      .isString()
      .notEmpty()
      .withMessage('verificationToken is required'),
    body('planId').isString().notEmpty().withMessage('planId is required'),
  ],
  createCheckoutSessionForVerifiedEmail,
);

export default router;

