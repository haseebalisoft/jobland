import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DOCUMENTS_UPLOAD_ROOT = path.join(__dirname, '../../uploads/user_documents');

export function kindFromMime(mime, originalName) {
  const ext = (originalName || '').split('.').pop()?.toUpperCase() || '';
  if (mime?.includes('pdf')) return 'PDF';
  if (mime?.includes('word') || ext === 'DOCX' || ext === 'DOC') return ext === 'DOC' ? 'DOC' : 'DOCX';
  if (mime?.includes('png')) return 'PNG';
  if (mime?.includes('jpeg') || mime?.includes('jpg')) return 'JPG';
  return ext || 'FILE';
}

export async function ensureUploadDir(userId) {
  const dir = path.join(DOCUMENTS_UPLOAD_ROOT, String(userId));
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function listDocuments(userId, { search, category, sort = 'created_desc', page = 1, limit = 24 }) {
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit, 10) || 24, 1), 100);
  const offset = (p - 1) * l;

  const conditions = ['d.user_id = $1'];
  const params = [userId];
  let i = 2;

  if (search && String(search).trim()) {
    conditions.push(`(d.title ILIKE $${i} OR d.description ILIKE $${i})`);
    params.push(`%${String(search).trim()}%`);
    i += 1;
  }
  if (category && String(category).trim() && category !== 'all') {
    conditions.push(`d.category = $${i}`);
    params.push(String(category).trim());
    i += 1;
  }

  const orderMap = {
    title_asc: 'd.title ASC',
    title_desc: 'd.title DESC',
    category_asc: 'd.category ASC',
    category_desc: 'd.category DESC',
    kind_asc: 'd.kind ASC NULLS LAST',
    kind_desc: 'd.kind DESC NULLS LAST',
    created_asc: 'd.created_at ASC',
    created_desc: 'd.created_at DESC',
    job_asc: 'j.title ASC NULLS LAST',
    job_desc: 'j.title DESC NULLS LAST',
  };
  const orderBy = orderMap[sort] || 'd.created_at DESC';

  const where = conditions.join(' AND ');
  params.push(l, offset);

  const dataRes = await query(
    `
      SELECT
        d.id,
        d.title,
        d.category,
        d.kind,
        d.description,
        d.file_name,
        d.mime_type,
        d.file_size,
        d.created_at,
        d.job_id,
        j.title AS job_title
      FROM user_documents d
      LEFT JOIN jobs j ON j.id = d.job_id
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT $${i} OFFSET $${i + 1}
    `,
    params,
  );

  const countRes = await query(
    `SELECT COUNT(*)::int AS c FROM user_documents d WHERE ${where}`,
    params.slice(0, params.length - 2),
  );

  return {
    documents: (dataRes.rows || []).map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      kind: r.kind,
      description: r.description,
      fileName: r.file_name,
      mimeType: r.mime_type,
      fileSize: r.file_size,
      createdAt: r.created_at,
      jobId: r.job_id,
      jobLinked: r.job_title || null,
    })),
    total: countRes.rows[0]?.c ?? 0,
    page: p,
    limit: l,
  };
}

export async function getDocumentForUser(userId, documentId) {
  const r = await query(`SELECT * FROM user_documents WHERE id = $1 AND user_id = $2`, [documentId, userId]);
  return r.rows[0] || null;
}

export async function createDocumentRecord(userId, payload) {
  const {
    title,
    category,
    description,
    file_name,
    storage_path,
    mime_type,
    file_size,
    kind,
    job_id,
    source_cover_letter_id,
  } = payload;
  const ins = await query(
    `
      INSERT INTO user_documents (
        user_id, title, category, description, file_name, storage_path, mime_type, file_size, kind, job_id, source_cover_letter_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `,
    [
      userId,
      title,
      category,
      description || null,
      file_name,
      storage_path,
      mime_type || null,
      file_size || null,
      kind || null,
      job_id || null,
      source_cover_letter_id || null,
    ],
  );
  return ins.rows[0];
}

export async function deleteDocument(userId, documentId) {
  const row = await getDocumentForUser(userId, documentId);
  if (!row) {
    const err = new Error('Document not found');
    err.statusCode = 404;
    throw err;
  }
  try {
    await fs.unlink(row.storage_path);
  } catch {
    /* file may be missing */
  }
  await query(`DELETE FROM user_documents WHERE id = $1 AND user_id = $2`, [documentId, userId]);
  return { success: true };
}

export async function createDocumentFromText(userId, { title, category, description, content, source_cover_letter_id }) {
  const dir = await ensureUploadDir(userId);
  const safeName = `cover-letter-${Date.now()}.txt`;
  const fullPath = path.join(dir, safeName);
  await fs.writeFile(fullPath, String(content || ''), 'utf8');
  const stat = await fs.stat(fullPath);
  const row = await createDocumentRecord(userId, {
    title,
    category: category || 'Cover Letter',
    description: description || null,
    file_name: safeName,
    storage_path: fullPath,
    mime_type: 'text/plain',
    file_size: stat.size,
    kind: 'TXT',
    job_id: null,
    source_cover_letter_id: source_cover_letter_id || null,
  });
  return row;
}
