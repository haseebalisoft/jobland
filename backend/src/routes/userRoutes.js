import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { saveOnboarding } from '../controllers/userController.js';

const router = express.Router();

router.post('/onboarding', authMiddleware, saveOnboarding);

export default router;

