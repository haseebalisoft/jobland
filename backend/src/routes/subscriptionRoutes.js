import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  createCheckoutSessionController,
  getMySubscription,
} from '../controllers/subscriptionController.js';

const router = express.Router();

router.post('/checkout-session', authMiddleware, createCheckoutSessionController);
router.get('/me', authMiddleware, getMySubscription);

export default router;

