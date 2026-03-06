import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { getProfile, saveProfile } from '../controllers/profileController.js';

const router = express.Router();

router.get('/', authMiddleware, getProfile);
router.post('/', authMiddleware, saveProfile);

export default router;

