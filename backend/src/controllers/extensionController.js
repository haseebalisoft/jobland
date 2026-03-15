import { query } from '../config/db.js';

/**
 * POST /api/extension/jobs
 * Capture extension: submit job from extension. Auth via Bearer token (oneclick_api_key).
 * Creates or reuses job by job_url, then creates job_assignment for the BD.
 */
export async function submitJobFromExtension(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    if (!apiKey) {
      return res.status(401).json({ message: 'Missing or invalid Authorization. Use: Bearer <your Capture API key>' });
    }

    const userRow = await query(
      'SELECT id, role FROM users WHERE oneclick_api_key = $1 AND is_active = true',
      [apiKey]
    );
    if (userRow.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid or inactive Capture API key' });
    }
    const bdId = userRow.rows[0].id;
    if (userRow.rows[0].role !== 'bd' && userRow.rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Capture API key is only for BD or admin accounts' });
    }

    const { title, company_name, job_url, platform, location, description, work_type } = req.body || {};
    if (!title || !company_name || !job_url || !location || !work_type) {
      return res.status(400).json({ message: 'title, company_name, job_url, location, and work_type are required' });
    }
    const allowedWorkTypes = ['hybrid', 'onsite', 'remote'];
    const workType = allowedWorkTypes.includes(String(work_type).toLowerCase().trim())
      ? String(work_type).toLowerCase().trim()
      : null;
    if (!workType) {
      return res.status(400).json({ message: 'work_type must be one of: hybrid, onsite, remote' });
    }

    const jobUrl = String(job_url).trim();
    let existingJob = await query(
      'SELECT id FROM jobs WHERE job_url = $1',
      [jobUrl]
    );

    let jobId;
    if (existingJob.rowCount > 0) {
      jobId = existingJob.rows[0].id;
    } else {
      try {
        const insertJob = await query(
          `INSERT INTO jobs (company_name, company_website, title, job_url, platform, location, description, work_type, created_at)
           VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING id`,
          [
            String(company_name).trim(),
            String(title).trim(),
            jobUrl,
            platform ? String(platform).trim().slice(0, 100) : null,
            String(location).trim().slice(0, 255),
            description ? String(description).trim().slice(0, 5000) : null,
            workType,
          ]
        );
        jobId = insertJob.rows[0].id;
      } catch (err) {
        if (err.code === '23505') {
          existingJob = await query('SELECT id FROM jobs WHERE job_url = $1', [jobUrl]);
          if (existingJob.rowCount > 0) jobId = existingJob.rows[0].id;
          else throw err;
        } else throw err;
      }
    }

    await query(
      `INSERT INTO job_assignments (job_id, user_id, bd_id, status, created_at, updated_at)
       VALUES ($1, NULL, $2, 'pending', NOW(), NOW())`,
      [jobId, bdId]
    );

    const leadRow = await query(
      `SELECT ja.id, ja.job_id, j.title AS job_title, j.company_name, j.job_url AS job_link, ja.status, ja.created_at
       FROM job_assignments ja
       JOIN jobs j ON j.id = ja.job_id
       WHERE ja.job_id = $1 AND ja.bd_id = $2
       ORDER BY ja.created_at DESC LIMIT 1`,
      [jobId, bdId]
    );
    const lead = leadRow.rows[0];
    return res.status(201).json({
      message: 'Job saved. It appears in your BD dashboard.',
      job_id: lead.job_id,
      lead_id: lead.id,
      job_title: lead.job_title,
      company_name: lead.company_name,
      job_link: lead.job_link,
      status: lead.status,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'This job URL was already added by you. Check Your leads in the BD dashboard.' });
    }
    next(err);
  }
}
