import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { getDashboardSummary, getDashboardActionPlan } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/', authMiddleware, getDashboardSummary);
router.get('/action-plan', authMiddleware, getDashboardActionPlan);

export default router;

