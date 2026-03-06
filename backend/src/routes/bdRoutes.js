import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { getMyUsers } from '../controllers/bdController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/my-users', getMyUsers);

export default router;
