import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { parseCv } from '../controllers/cvController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Accept single file field named "resume"
router.post('/parse', authMiddleware, upload.single('resume'), parseCv);

export default router;

