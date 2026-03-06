import { query } from '../config/db.js';

const BASE_SELECT = `
  SELECT
    l.id,
    l.job_id,
    l.job_title,
    l.company_name,
    l.job_link,
    l.status,
    l.assigned_user_id,
    l.bd_id,
    l.created_at
  FROM leads l
`;

export async function insertLead({
  job_id,
  job_title,
  company_name,
  job_link,
  status = 'pending',
  assigned_user_id = null,
  bd_id,
}) {
  const result = await query(
    `
      INSERT INTO leads (
        id,
        job_id,
        job_title,
        company_name,
        job_link,
        status,
        assigned_user_id,
        bd_id,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        NOW()
      )
      RETURNING *
    `,
    [job_id, job_title, company_name, job_link, status, assigned_user_id, bd_id],
  );
  return result.rows[0];
}

export async function findLeadById(id) {
  const result = await query(`${BASE_SELECT} WHERE l.id = $1`, [id]);
  return result.rows[0] || null;
}

export async function updateLeadAssignment(id, assigned_user_id) {
  const result = await query(
    `
      UPDATE leads
      SET assigned_user_id = $2
      WHERE id = $1
      RETURNING *
    `,
    [id, assigned_user_id],
  );
  return result.rows[0] || null;
}

export async function updateLeadStatus(id, status) {
  const result = await query(
    `
      UPDATE leads
      SET status = $2
      WHERE id = $1
      RETURNING *
    `,
    [id, status],
  );
  return result.rows[0] || null;
}


