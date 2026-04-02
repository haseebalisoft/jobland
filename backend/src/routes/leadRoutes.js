import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  createLead,
  assignLeadController,
  updateLeadStatusController,
  getLeadsByRole,
  getBdLeads,
  getUserLeads,
  getFilteredLeads,
  getLeadStatistics,
  markLeadAppliedController,
  getLeadMessagesController,
  addLeadMessageController,
} from '../controllers/leadController.js';

const router = express.Router();

router.use(authMiddleware);

// Role-based: GET /api/leads returns leads by role (user sees assigned-BD leads; bd/admin see BD leads)
router.get('/', getLeadsByRole);

// BD / Admin
router.post('/', createLead);
router.patch('/:id/assign', assignLeadController);
router.patch('/:id/status', updateLeadStatusController);
router.get('/bd', getBdLeads);

// User (explicit endpoint; same data as GET / for role=user)
router.get('/user', getUserLeads);
router.post('/:id/applied', markLeadAppliedController);

// Lead messages (user ↔ BD help chat for a specific lead)
router.get('/:id/messages', getLeadMessagesController);
router.post('/:id/messages', addLeadMessageController);

// Admin / filters
router.get('/filter', getFilteredLeads);
router.get('/stats', getLeadStatistics);

export default router;

