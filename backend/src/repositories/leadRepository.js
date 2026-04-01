import { query } from '../config/db.js';

// All \"lead\" data is now stored as job assignments linked to the jobs table.
// This lets us drop the old leads table entirely while keeping the same API shape.

const BASE_SELECT = `
  SELECT
    ja.id,
    ja.job_id,
    j.company_name,
    j.title AS job_title,
    j.job_url AS job_link,
    j.description AS job_description,
    ja.status,
    ja.user_id AS assigned_user_id,
    ja.bd_id,
    ja.created_at
  FROM job_assignments ja
  JOIN jobs j ON j.id = ja.job_id
`;

export async function insertLead({
  job_id,
  job_title,
  company_name,
  job_link,
  job_description = null,
  status = 'pending',
  assigned_user_id = null,
  bd_id,
}) {
  // Ensure a job exists; either reuse by job_id or by unique job_url, or create a new one.
  let resolvedJobId = job_id || null;

  if (!resolvedJobId) {
    // Try to reuse an existing job by job_url (unique)
    const existingJob = await query(
      `SELECT id, company_name, title, job_url, bd_id, description FROM jobs WHERE job_url = $1 AND bd_id = $2`,
      [job_link, bd_id],
    );
    if (existingJob.rowCount > 0) {
      resolvedJobId = existingJob.rows[0].id;
      if (job_description && job_description.trim()) {
        await query(
          `
            UPDATE jobs
            SET description = $2
            WHERE id = $1
          `,
          [resolvedJobId, job_description.trim()],
        );
      }
    } else {
      const insertJob = await query(
        `
          INSERT INTO jobs (company_name, company_website, title, job_url, platform, location, description, bd_id, created_at)
          VALUES ($1, NULL, $2, $3, NULL, NULL, $4, $5, NOW())
          RETURNING id
        `,
        [company_name, job_title, job_link, job_description || null, bd_id],
      );
      resolvedJobId = insertJob.rows[0].id;
    }
  }

  const assignment = await query(
    `
      INSERT INTO job_assignments (
        id,
        job_id,
        user_id,
        bd_id,
        status,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        NOW(),
        NOW()
      )
      RETURNING id
    `,
    [resolvedJobId, assigned_user_id, bd_id, status],
  );

  const id = assignment.rows[0].id;
  const result = await query(`${BASE_SELECT} WHERE ja.id = $1`, [id]);
  return result.rows[0];
}

export async function findLeadById(id) {
  const result = await query(`${BASE_SELECT} WHERE ja.id = $1`, [id]);
  return result.rows[0] || null;
}

export async function updateLeadAssignment(id, assigned_user_id) {
  await query(
    `
      UPDATE job_assignments
      SET user_id = $2::uuid,
          status = CASE
                     WHEN $2::uuid IS NOT NULL THEN 'assigned'::job_assignment_status
                     ELSE status
                   END,
          updated_at = NOW()
      WHERE id = $1
    `,
    [id, assigned_user_id],
  );
  const result = await query(`${BASE_SELECT} WHERE ja.id = $1`, [id]);
  return result.rows[0] || null;
}

export async function updateLeadStatus(id, status) {
  await query(
    `
      UPDATE job_assignments
      SET status = $2,
          updated_at = NOW()
      WHERE id = $1
    `,
    [id, status],
  );
  const result = await query(`${BASE_SELECT} WHERE ja.id = $1`, [id]);
  return result.rows[0] || null;
}



