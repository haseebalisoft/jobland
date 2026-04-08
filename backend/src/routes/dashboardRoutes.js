import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  getDashboardSummary,
  getDashboardActionPlan,
  getDashboardStats,
  getDashboardTasks,
} from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/', authMiddleware, getDashboardSummary);
router.get('/action-plan', authMiddleware, getDashboardActionPlan);
router.get('/stats', authMiddleware, getDashboardStats);
router.get('/tasks', authMiddleware, getDashboardTasks);

export default router;

