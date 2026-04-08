import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { getSuggestions } from '../controllers/aiController.js';

const router = express.Router();

router.get('/suggestions', authMiddleware, getSuggestions);

export default router;
