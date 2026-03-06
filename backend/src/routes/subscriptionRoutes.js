import express from 'express';
import {
  authMiddleware,
  optionalAuthMiddleware,
} from '../middlewares/authMiddleware.js';
import {
  confirmCheckoutSessionController,
  createCheckoutSessionController,
  getMySubscription,
} from '../controllers/subscriptionController.js';

const router = express.Router();

router.post('/checkout-session', optionalAuthMiddleware, createCheckoutSessionController);
router.get(
  '/checkout-session/:sessionId',
  authMiddleware,
  confirmCheckoutSessionController,
);
router.get('/me', authMiddleware, getMySubscription);

export default router;

