import { query } from '../config/db.js';

const ALLOWED_STATUSES = new Set(['saved', 'applied', 'interviewing', 'offer']);

export async function listUserJobs(userId) {
  const res = await query(
    `
      SELECT
        id,
        user_id,
        title,
        company,
        job_url,
        salary_range,
        notes,
        status,
        sort_index,
        created_at,
        updated_at
      FROM user_jobs
      WHERE user_id = $1
      ORDER BY sort_index ASC, created_at DESC
    `,
    [userId],
  );
  return res.rows || [];
}

export async function createUserJob(userId, payload) {
  const title = String(payload?.title || '').trim();
  const company = String(payload?.company || '').trim();
  const job_url = payload?.job_url ? String(payload.job_url).trim() : null;
  const notes = payload?.notes ? String(payload.notes).trim() : null;

  if (!title || !company) {
    const err = new Error('title and company are required');
    err.statusCode = 400;
    throw err;
  }

  const res = await query(
    `
      INSERT INTO user_jobs (user_id, title, company, job_url, notes, status)
      VALUES ($1, $2, $3, $4, $5, 'saved')
      RETURNING
        id,
        user_id,
        title,
        company,
        job_url,
        salary_range,
        notes,
        status,
        sort_index,
        created_at,
        updated_at
    `,
    [userId, title, company, job_url, notes],
  );
  return res.rows[0];
}

export async function updateUserJobStatus(userId, jobId, status) {
  if (!ALLOWED_STATUSES.has(status)) {
    const err = new Error('Invalid status');
    err.statusCode = 400;
    throw err;
  }

  const res = await query(
    `
      UPDATE user_jobs
      SET status = $3,
          updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING
        id,
        user_id,
        title,
        company,
        job_url,
        salary_range,
        notes,
        status,
        sort_index,
        created_at,
        updated_at
    `,
    [jobId, userId, status],
  );

  if (res.rowCount === 0) {
    const err = new Error('Job not found');
    err.statusCode = 404;
    throw err;
  }

  return res.rows[0];
}
