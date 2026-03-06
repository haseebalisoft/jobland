import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  createLead,
  assignLeadController,
  updateLeadStatusController,
  getBdLeads,
  getUserLeads,
  getFilteredLeads,
  getLeadStatistics,
  markLeadAppliedController,
} from '../controllers/leadController.js';

const router = express.Router();

router.use(authMiddleware);

// BD / Admin
router.post('/', createLead);
router.patch('/:id/assign', assignLeadController);
router.patch('/:id/status', updateLeadStatusController);
router.get('/bd', getBdLeads);

// User
router.get('/user', getUserLeads);
router.post('/:id/applied', markLeadAppliedController);

// Admin / filters
router.get('/filter', getFilteredLeads);
router.get('/stats', getLeadStatistics);

export default router;

