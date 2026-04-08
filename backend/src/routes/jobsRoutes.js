import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { getJobCounts } from '../controllers/userJobController.js';

const router = express.Router();

router.get('/counts', authMiddleware, getJobCounts);

export default router;
