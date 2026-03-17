import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  updateStatusController,
  upsertInterviewController,
  getInterviewController,
} from '../controllers/applicationController.js';

const router = express.Router();

router.use(authMiddleware);

// Update application status (BD/admin) – also updates related job_assignments.status
router.patch('/:id/status', updateStatusController);

// Upsert interview details for an application (BD/admin)
router.post('/:id/interview', upsertInterviewController);

// Get interview details for an application (user/BD/admin if authorized)
router.get('/:id/interview', getInterviewController);

export default router;

