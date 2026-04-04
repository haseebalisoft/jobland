import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  getScenarios,
  getScenario,
  getSession,
  postSession,
  postSessionMessage,
  putSessionEnd,
  postGenerateReport,
  getHistory,
  getReport,
  getSessionReport,
} from '../controllers/mockInterviewController.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/scenarios', getScenarios);
router.get('/scenarios/:id', getScenario);
router.post('/sessions', postSession);
router.get('/sessions/:id', getSession);
router.post('/sessions/:id/message', postSessionMessage);
router.put('/sessions/:id/end', putSessionEnd);
router.post('/sessions/:id/generate-report', postGenerateReport);
router.get('/sessions/:sessionId/report', getSessionReport);
router.get('/history', getHistory);
router.get('/reports/:id', getReport);

export default router;
