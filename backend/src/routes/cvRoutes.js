import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  getCvProfile,
  saveCvProfile,
  improveSummaryHandler,
  optimizeExperienceHandler,
  optimizeFullResumeHandler,
  listTemplates,
  downloadPdf,
  parseCv,
  attachParseUpload,
} from '../controllers/cvController.js';

const router = express.Router();

router.get('/profile', authMiddleware, getCvProfile);
router.post('/profile', authMiddleware, saveCvProfile);
router.post('/improve-summary', authMiddleware, improveSummaryHandler);
router.post('/optimize-experience', authMiddleware, optimizeExperienceHandler);
router.post('/optimize-full-resume', authMiddleware, optimizeFullResumeHandler);
router.get('/templates', authMiddleware, listTemplates);
router.post('/download', authMiddleware, downloadPdf);
router.post('/parse', authMiddleware, attachParseUpload(), parseCv);

export default router;
