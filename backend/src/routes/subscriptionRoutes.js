import express from 'express';
import {
  authMiddleware,
  optionalAuthMiddleware,
} from '../middlewares/authMiddleware.js';
import {
  confirmCheckoutSessionController,
  createCheckoutSessionController,
  createCheckoutSessionAuthController,
  getMySubscription,
  optOutToFreeController,
} from '../controllers/subscriptionController.js';

const router = express.Router();

router.post('/checkout-session', optionalAuthMiddleware, createCheckoutSessionController);
router.post('/checkout-session-auth', authMiddleware, createCheckoutSessionAuthController);
router.post('/opt-out-free', authMiddleware, optOutToFreeController);
router.get(
  '/checkout-session/:sessionId',
  authMiddleware,
  confirmCheckoutSessionController,
);
router.get('/me', authMiddleware, getMySubscription);

export default router;

