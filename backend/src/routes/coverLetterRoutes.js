import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  postGenerateCoverLetter,
  getCoverLetterHistory,
  getCoverLetterById,
  postSaveCoverLetterToDocuments,
} from '../controllers/coverLetterController.js';

const router = express.Router();
router.use(authMiddleware);

router.post('/generate', postGenerateCoverLetter);
router.get('/history', getCoverLetterHistory);
router.get('/:id', getCoverLetterById);
router.post('/:id/save-to-documents', postSaveCoverLetterToDocuments);

export default router;
