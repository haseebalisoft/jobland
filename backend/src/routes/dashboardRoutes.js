import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { getDashboardSummary } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/', authMiddleware, getDashboardSummary);

export default router;

