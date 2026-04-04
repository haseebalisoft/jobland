import express from 'express';
import {
  adminGetScenarios,
  adminGetScenario,
  adminCreateScenario,
  adminUpdateScenario,
  adminDeleteScenario,
  adminListSessions,
  adminGetSession,
  adminAnalytics,
} from '../controllers/mockInterviewAdminController.js';

const router = express.Router();

router.get('/scenarios', adminGetScenarios);
router.get('/scenarios/:id', adminGetScenario);
router.post('/scenarios', adminCreateScenario);
router.put('/scenarios/:id', adminUpdateScenario);
router.delete('/scenarios/:id', adminDeleteScenario);
router.get('/sessions', adminListSessions);
router.get('/sessions/:id', adminGetSession);
router.get('/analytics', adminAnalytics);

export default router;
