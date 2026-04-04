import {
  createResumeFromUpload,
  createBlankResume,
  createResumeFromAiPrompt,
  createResumeFromLinkedIn,
} from '../services/resumeCreationService.js';
import { getSavedResumeSnapshotForUser, listSavedResumesForUser } from '../services/cvService.js';
import {
  buildLinkedInAuthUrl,
  isLinkedInConfigured,
  signLinkedInOAuthState,
} from '../services/linkedinOAuthService.js';

const multer = (await import('multer')).default;

const uploadResumeMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ok =
      /\.(pdf|docx|doc)$/i.test(file.originalname || '') ||
      [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
      ].includes(file.mimetype);
    cb(null, ok);
  },
}).single('file');

export { uploadResumeMiddleware };

export async function postResumeUpload(req, res, next) {
  try {
    const actor = req.user;
    if (!actor || actor.role !== 'user') {
      return res.status(403).json({ message: 'Only users can upload resumes.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'file is required (multipart field: file)' });
    }
    const name = req.body?.name ? String(req.body.name) : '';
    const result = await createResumeFromUpload(actor.id, req.file, name, actor);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function postResume(req, res, next) {
  try {
    const actor = req.user;
    if (!actor || actor.role !== 'user') {
      return res.status(403).json({ message: 'Only users can create resumes.' });
    }
    const body = req.body || {};
    const result = await createBlankResume(actor.id, body, actor);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function postResumeFromLinkedIn(req, res, next) {
  try {
    const actor = req.user;
    if (!actor || actor.role !== 'user') {
      return res.status(403).json({ message: 'Only users can create resumes.' });
    }
    try {
      const result = await createResumeFromLinkedIn(actor.id, actor);
      res.status(201).json(result);
    } catch (err) {
      if (err.code === 'LINKEDIN_NOT_CONNECTED' && isLinkedInConfigured()) {
        const state = signLinkedInOAuthState(actor.id);
        const authorizationUrl = buildLinkedInAuthUrl(state);
        return res.status(400).json({
          code: 'LINKEDIN_NOT_CONNECTED',
          message: 'Connect LinkedIn to import your profile.',
          authorizationUrl,
        });
      }
      if (err.code === 'LINKEDIN_NOT_CONNECTED') {
        return res.status(400).json({
          code: 'LINKEDIN_NOT_CONFIGURED',
          message: 'LinkedIn integration is not configured. Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET.',
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

export async function postResumeFromAi(req, res, next) {
  try {
    const actor = req.user;
    if (!actor || actor.role !== 'user') {
      return res.status(403).json({ message: 'Only users can create resumes.' });
    }
    const prompt = req.body?.prompt;
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ message: 'prompt is required' });
    }
    const result = await createResumeFromAiPrompt(actor.id, String(prompt), actor);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getSavedResumesList(req, res, next) {
  try {
    const actor = req.user;
    if (!actor || actor.role !== 'user') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const rows = await listSavedResumesForUser(actor.id);
    res.json({
      resumes: (rows || []).map((r) => ({
        id: r.id,
        title: r.title,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getResumeById(req, res, next) {
  try {
    const actor = req.user;
    if (!actor || actor.role !== 'user') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { resumeId } = req.params;
    const row = await getSavedResumeSnapshotForUser(resumeId, actor.id);
    if (!row) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    res.json({
      resumeId: row.id,
      name: row.title,
      extractedData: row.profile_snapshot_json,
    });
  } catch (err) {
    next(err);
  }
}
