import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { saveOnboarding } from '../controllers/userController.js';
import {
  getUserProfile,
  getUserPlan,
  getUserProgress,
  putUserProgressItem,
  putUserProgressStep,
  createResumeSession,
} from '../controllers/userDashboardController.js';
import {
  getUserJobs,
  postUserJob,
  patchUserJobStatus,
} from '../controllers/userJobController.js';

const router = express.Router();

router.post('/onboarding', authMiddleware, saveOnboarding);

router.get('/profile', authMiddleware, getUserProfile);
router.get('/plan', authMiddleware, getUserPlan);
router.get('/progress', authMiddleware, getUserProgress);
router.put('/progress/step', authMiddleware, putUserProgressStep);
router.put('/progress/:itemId', authMiddleware, putUserProgressItem);
router.post('/resume/create', authMiddleware, createResumeSession);

router.get('/jobs', authMiddleware, getUserJobs);
router.post('/jobs', authMiddleware, postUserJob);
router.patch('/jobs/:id', authMiddleware, patchUserJobStatus);

export default router;

