import express from 'express';
import { authMiddleware, requireAdmin } from '../middlewares/authMiddleware.js';
import {
  getUsers,
  getBds,
  assignBdToUser,
  getSubscriptions,
  blockUser,
  unblockUser,
  resetUserPassword,
  cancelSubscription,
  adminStats,
  getAnalytics,
  getPlansAdmin,
  createPlanAdmin,
  updatePlanAdmin,
  setUserPlan,
} from '../controllers/adminController.js';
import mockInterviewAdminRoutes from './mockInterviewAdminRoutes.js';

const router = express.Router();

router.use(authMiddleware, requireAdmin);

router.get('/users', getUsers);
router.get('/bds', getBds);
router.post('/assign-bd', assignBdToUser);
router.get('/subscriptions', getSubscriptions);
router.post('/users/:id/block', blockUser);
router.post('/users/:id/unblock', unblockUser);
router.post('/users/:id/reset-password', resetUserPassword);
router.post('/subscriptions/:id/cancel', cancelSubscription);
router.get('/stats', adminStats);
router.get('/analytics', getAnalytics);
router.get('/plans', getPlansAdmin);
router.post('/plans', createPlanAdmin);
router.put('/plans/:id', updatePlanAdmin);
router.put('/users/:id/subscription-plan', setUserPlan);

router.use('/mock-interviews', mockInterviewAdminRoutes);

export default router;

