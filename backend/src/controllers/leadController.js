import {
  createLeadForBd,
  assignLead,
  updateLeadStatusService,
  listBdLeads,
  listUserLeads,
  listLeadsForAdmin,
  getLeadStats,
  markLeadAppliedByUser,
} from '../services/leadService.js';

export async function createLead(req, res, next) {
  try {
    const actor = req.user;
    if (actor.role !== 'bd' && actor.role !== 'admin') {
      return res.status(403).json({ message: 'Only BD or admin can create leads' });
    }
    const lead = await createLeadForBd(actor.id, req.body, actor.role);
    res.status(201).json(lead);
  } catch (err) {
    next(err);
  }
}

export async function assignLeadController(req, res, next) {
  try {
    const actor = req.user;
    if (actor.role !== 'bd' && actor.role !== 'admin') {
      return res.status(403).json({ message: 'Only BD or admin can assign leads' });
    }
    const { id } = req.params;
    const { assigned_user_id } = req.body || {};
    if (!assigned_user_id) {
      return res.status(400).json({ message: 'assigned_user_id is required' });
    }
    const updated = await assignLead(id, actor.id, assigned_user_id, actor.role);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function updateLeadStatusController(req, res, next) {
  try {
    const actor = req.user;
    if (actor.role !== 'bd' && actor.role !== 'admin') {
      return res.status(403).json({ message: 'Only BD or admin can update lead status' });
    }
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({ message: 'status is required' });
    }
    const updated = await updateLeadStatusService(id, status, actor);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leads - Returns leads based on logged-in user's role.
 * - user: leads from BDs assigned to this user (user_bd_assignments).
 * - bd / admin: leads created by this BD.
 * Query: range (today|3days|7days|15days|all), page, limit.
 */
export async function getLeadsByRole(req, res, next) {
  try {
    const actor = req.user;
    const { range = 'all', page, limit } = req.query;

    if (actor.role === 'user' || !actor.role) {
      const result = await listUserLeads(actor.id, { range, page, limit });
      return res.json(result);
    }
    if (actor.role === 'bd' || actor.role === 'admin') {
      const result = await listBdLeads(actor.id, { range, page, limit });
      return res.json(result);
    }

    return res.status(403).json({ message: 'Forbidden' });
  } catch (err) {
    next(err);
  }
}

export async function getBdLeads(req, res, next) {
  try {
    const actor = req.user;
    if (actor.role !== 'bd' && actor.role !== 'admin') {
      return res.status(403).json({ message: 'Only BD or admin can view BD leads' });
    }
    const { range = 'all', page, limit } = req.query;
    const result = await listBdLeads(actor.id, { range, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUserLeads(req, res, next) {
  try {
    const actor = req.user;
    const { range = 'all', page, limit } = req.query;
    const result = await listUserLeads(actor.id, { range, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getFilteredLeads(req, res, next) {
  try {
    const actor = req.user;
    if (actor.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }
    const { range = 'all', page, limit } = req.query;
    const result = await listLeadsForAdmin({ range, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getLeadStatistics(req, res, next) {
  try {
    const actor = req.user;
    if (actor.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }
    const stats = await getLeadStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function markLeadAppliedController(req, res, next) {
  try {
    const actor = req.user;
    const { id } = req.params;
    await markLeadAppliedByUser(id, actor.id);
    res.json({ message: 'Lead marked as applied' });
  } catch (err) {
    next(err);
  }
}

