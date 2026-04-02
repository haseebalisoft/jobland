import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requirePaidPlan } from '../middlewares/featureAccessMiddleware.js';
import {
  getCvProfile,
  saveCvProfile,
  improveSummaryHandler,
  optimizeExperienceHandler,
  optimizeFullResumeHandler,
  jobMatchOnlyHandler,
  atsDeepAnalysisHandler,
  listTemplates,
  previewPdf,
  downloadPdf,
  parseCv,
  attachParseUpload,
  saveFinalizedResumeHandler,
  listMySavedResumesHandler,
  listBdUserSavedResumesHandler,
  uploadSavedResumeMiddleware,
  uploadSavedResumeHandler,
  getSavedResumeFileHandler,
  deleteSavedResumeHandler,
} from '../controllers/cvController.js';

const router = express.Router();

router.get('/profile', authMiddleware, getCvProfile);
router.post('/profile', authMiddleware, saveCvProfile);
router.post('/improve-summary', authMiddleware, improveSummaryHandler);
router.post('/optimize-experience', authMiddleware, optimizeExperienceHandler);
router.post('/optimize-full-resume', authMiddleware, optimizeFullResumeHandler);
router.post('/job-match', authMiddleware, jobMatchOnlyHandler);
router.post('/ats-analysis', authMiddleware, atsDeepAnalysisHandler);
/** Alias (same handler) — some proxies or older clients mishandle hyphens in paths */
router.post('/atsanalysis', authMiddleware, atsDeepAnalysisHandler);
router.get('/templates', authMiddleware, listTemplates);
router.post('/preview', authMiddleware, previewPdf);
router.post('/download', authMiddleware, requirePaidPlan, downloadPdf);
router.post('/parse', authMiddleware, attachParseUpload(), parseCv);
router.post('/saved', authMiddleware, saveFinalizedResumeHandler);
router.get('/saved', authMiddleware, listMySavedResumesHandler);
router.get('/saved/:id/file', authMiddleware, getSavedResumeFileHandler);
router.delete('/saved/:id', authMiddleware, deleteSavedResumeHandler);
router.get('/saved/user/:userId', authMiddleware, listBdUserSavedResumesHandler);
router.post('/saved/upload', authMiddleware, uploadSavedResumeMiddleware, uploadSavedResumeHandler);
// Backward/forward-compatible aliases
router.post('/saved-resumes', authMiddleware, saveFinalizedResumeHandler);
router.get('/saved-resumes', authMiddleware, listMySavedResumesHandler);
router.get('/saved-resumes/:id/file', authMiddleware, getSavedResumeFileHandler);
router.delete('/saved-resumes/:id', authMiddleware, deleteSavedResumeHandler);
router.get('/saved-resumes/user/:userId', authMiddleware, listBdUserSavedResumesHandler);
router.post('/saved-resumes/upload', authMiddleware, uploadSavedResumeMiddleware, uploadSavedResumeHandler);

export default router;
