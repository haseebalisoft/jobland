import { updateApplicationStatus, upsertInterview, getInterview } from '../services/applicationService.js';

export async function updateStatusController(req, res, next) {
  try {
    const actor = req.user;
    if (!actor || (actor.role !== 'bd' && actor.role !== 'admin')) {
      return res.status(403).json({ message: 'BD or admin only' });
    }
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({ message: 'status is required' });
    }
    await updateApplicationStatus(id, status, actor);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function upsertInterviewController(req, res, next) {
  try {
    const actor = req.user;
    if (!actor || (actor.role !== 'bd' && actor.role !== 'admin')) {
      return res.status(403).json({ message: 'BD or admin only' });
    }
    const { id } = req.params;
    const interviewId = await upsertInterview(id, req.body, actor);
    res.json({ id: interviewId });
  } catch (err) {
    next(err);
  }
}

export async function getInterviewController(req, res, next) {
  try {
    const actor = req.user;
    if (!actor) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    const data = await getInterview(id, actor);
    res.json(data || {});
  } catch (err) {
    next(err);
  }
}

