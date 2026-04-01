import multer from 'multer';
import {
  updateApplicationStatus,
  upsertInterview,
  getInterview,
  upsertApplicationResume,
  getApplicationResume,
  attachSavedResumeToApplication,
  attachProfileResumeToApplication,
} from '../services/applicationService.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

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

export const uploadApplicationResumeMiddleware = upload.single('resume');

export async function uploadApplicationResumeController(req, res, next) {
  try {
    const actor = req.user;
    if (!actor) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    const { source } = req.body || {};
    const result = await upsertApplicationResume(id, req.file, source, actor);
    res.json(result);
  } catch (err) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Resume file must be 5MB or smaller.' });
    }
    next(err);
  }
}

export async function getApplicationResumeController(req, res, next) {
  try {
    const actor = req.user;
    if (!actor) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    const file = await getApplicationResume(id, actor);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`);
    res.sendFile(file.absolutePath);
  } catch (err) {
    next(err);
  }
}

export async function attachSavedResumeController(req, res, next) {
  try {
    const actor = req.user;
    if (!actor) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    const { saved_resume_id } = req.body || {};
    if (!saved_resume_id) {
      return res.status(400).json({ message: 'saved_resume_id is required' });
    }
    const result = await attachSavedResumeToApplication(id, saved_resume_id, actor);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function attachProfileResumeController(req, res, next) {
  try {
    const actor = req.user;
    if (!actor) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (actor.role !== 'bd' && actor.role !== 'admin') {
      return res.status(403).json({ message: 'BD or admin only' });
    }
    const { id } = req.params;
    const result = await attachProfileResumeToApplication(id, actor);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

