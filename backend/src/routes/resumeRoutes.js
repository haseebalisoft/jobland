import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requirePaidPlan } from '../middlewares/featureAccessMiddleware.js';
import {
  uploadResumeMiddleware,
  postResumeUpload,
  postResume,
  postResumeFromLinkedIn,
  postResumeFromAi,
  getSavedResumesList,
  getResumeById,
} from '../controllers/resumeController.js';

const router = express.Router();

router.get('/', authMiddleware, getSavedResumesList);
router.post('/upload', authMiddleware, requirePaidPlan, uploadResumeMiddleware, postResumeUpload);
router.post('/from-linkedin', authMiddleware, requirePaidPlan, postResumeFromLinkedIn);
router.post('/from-ai', authMiddleware, requirePaidPlan, postResumeFromAi);
router.post('/', authMiddleware, requirePaidPlan, postResume);
router.get('/:resumeId', authMiddleware, getResumeById);

export default router;
