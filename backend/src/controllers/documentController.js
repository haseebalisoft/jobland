import path from 'path';
import multer from 'multer';
import {
  ensureUploadDir,
  listDocuments,
  getDocumentForUser,
  createDocumentRecord,
  deleteDocument,
  kindFromMime,
} from '../services/documentService.js';

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const dir = await ensureUploadDir(req.user.id);
      cb(null, dir);
    } catch (e) {
      cb(e);
    }
  },
  filename: (req, file, cb) => {
    const safe = `${Date.now()}-${String(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    cb(null, safe);
  },
});

export const documentUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok =
      /pdf|msword|wordprocessingml|png|jpeg|jpg/i.test(file.mimetype) ||
      /\.(pdf|doc|docx|png|jpe?g)$/i.test(file.originalname);
    if (!ok) {
      cb(new Error('Only PDF, DOC, DOCX, PNG, JPG allowed'));
      return;
    }
    cb(null, true);
  },
});

export async function getDocuments(req, res, next) {
  try {
    const { search, category, sort, page, limit } = req.query;
    const result = await listDocuments(req.user.id, { search, category, sort, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function postDocument(req, res, next) {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ message: 'file is required' });
    const title = String(req.body.title || '').trim();
    const category = String(req.body.category || '').trim();
    if (!title || !category) {
      return res.status(400).json({ message: 'title and category are required' });
    }
    const description = req.body.description ? String(req.body.description).trim() : null;
    const job_id = req.body.jobId || req.body.job_id || null;

    const row = await createDocumentRecord(req.user.id, {
      title,
      category,
      description,
      file_name: f.originalname || f.filename,
      storage_path: path.resolve(f.path),
      mime_type: f.mimetype,
      file_size: f.size,
      kind: kindFromMime(f.mimetype, f.originalname),
      job_id,
      source_cover_letter_id: null,
    });

    res.status(201).json({
      document: {
        id: row.id,
        title: row.title,
        category: row.category,
        kind: row.kind,
        fileName: row.file_name,
        createdAt: row.created_at,
        jobLinked: null,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteDocumentById(req, res, next) {
  try {
    await deleteDocument(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function downloadDocument(req, res, next) {
  try {
    const row = await getDocumentForUser(req.user.id, req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(row.file_name)}"`);
    res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
    res.sendFile(path.resolve(row.storage_path), (err) => {
      if (err) next(err);
    });
  } catch (err) {
    next(err);
  }
}
