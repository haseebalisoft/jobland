import {
  listUserJobs,
  createUserJob,
  updateUserJobStatus,
  getUserJobCounts,
} from '../services/userJobService.js';

export async function getUserJobs(req, res, next) {
  try {
    const rows = await listUserJobs(req.user.id);
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
}

export async function postUserJob(req, res, next) {
  try {
    const row = await createUserJob(req.user.id, req.body || {});
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

export async function patchUserJobStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({ message: 'status is required' });
    }
    const row = await updateUserJobStatus(req.user.id, id, status);
    res.json(row);
  } catch (err) {
    next(err);
  }
}

export async function getJobCounts(req, res, next) {
  try {
    const counts = await getUserJobCounts(req.user.id);
    res.json(counts);
  } catch (err) {
    next(err);
  }
}
