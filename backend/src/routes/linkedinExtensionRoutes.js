import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  postLinkedInAnalyze,
  postLinkedInGenerate,
  postLinkedInSyncProfile,
  getLinkedInChecklist,
} from '../controllers/linkedinExtensionController.js';

const router = express.Router();

router.post('/analyze', authMiddleware, postLinkedInAnalyze);
router.post('/generate', authMiddleware, postLinkedInGenerate);
router.post('/sync-profile', authMiddleware, postLinkedInSyncProfile);
router.get('/checklist', authMiddleware, getLinkedInChecklist);

export default router;
