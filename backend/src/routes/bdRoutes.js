import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { getBdAnalytics, getMyUsers, getOneClickToken } from '../controllers/bdController.js';

const router = express.Router();

router.get('/analytics', authMiddleware, getBdAnalytics);
router.get('/oneclick-token', authMiddleware, getOneClickToken);
router.get('/my-users', authMiddleware, getMyUsers);

export default router;
