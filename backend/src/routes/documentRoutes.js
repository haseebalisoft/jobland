import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  getDocuments,
  postDocument,
  deleteDocumentById,
  downloadDocument,
  documentUpload,
} from '../controllers/documentController.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', getDocuments);
router.post('/', documentUpload.single('file'), postDocument);
router.delete('/:id', deleteDocumentById);
router.get('/:id/download', downloadDocument);

export default router;
