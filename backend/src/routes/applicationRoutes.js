import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  updateStatusController,
  upsertInterviewController,
  getInterviewController,
  uploadApplicationResumeMiddleware,
  uploadApplicationResumeController,
  getApplicationResumeController,
  attachSavedResumeController,
  attachProfileResumeController,
} from '../controllers/applicationController.js';

const router = express.Router();

router.use(authMiddleware);

// Update application status (BD/admin) – also updates related job_assignments.status
router.patch('/:id/status', updateStatusController);

// Upsert interview details for an application (BD/admin)
router.post('/:id/interview', upsertInterviewController);

// Get interview details for an application (user/BD/admin if authorized)
router.get('/:id/interview', getInterviewController);

// Upload and read canonical application resume
router.post('/:id/resume', uploadApplicationResumeMiddleware, uploadApplicationResumeController);
router.get('/:id/resume', getApplicationResumeController);
router.post('/:id/attach-saved-resume', attachSavedResumeController);
router.post('/:id/attach-profile-resume', attachProfileResumeController);
// Backward/forward-compatible aliases
router.post('/:id/use-saved-resume', attachSavedResumeController);
router.post('/:id/use-profile-resume', attachProfileResumeController);

export default router;

