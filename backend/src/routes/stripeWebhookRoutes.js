import express from 'express';
import { stripeWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Mounted at /api/stripe/webhook with express.raw() in app.js
router.post('/', stripeWebhook);

export default router;

