import express from 'express';
import { stripeWebhook } from '../controllers/webhookController.js';

const router = express.Router();

router.post('/stripe', stripeWebhook);

export default router;

