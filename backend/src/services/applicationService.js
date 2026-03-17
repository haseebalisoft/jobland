import pool, { query } from '../config/db.js';

const ALLOWED_APPLICATION_STATUSES = new Set([
  'applied',
  'interview',
  'acceptance',
  'rejection',
  'withdrawn',
]);

function mapApplicationToAssignmentStatus(appStatus, hasAssignedUser) {
  switch (appStatus) {
    case 'applied':
      return hasAssignedUser ? 'assigned' : 'pending';
    case 'interview':
      return 'assigned';
    case 'acceptance':
    case 'rejection':
      return 'completed';
    case 'withdrawn':
      return 'failed';
    default:
      return null;
  }
}

export async function updateApplicationStatus(applicationId, newStatus, actor) {
  if (!ALLOWED_APPLICATION_STATUSES.has(newStatus)) {
    const err = new Error('Invalid application status');
    err.statusCode = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const appRes = await client.query(
      `
        SELECT
          a.id,
          a.user_id,
          a.job_id,
          a.bd_id,
          a.current_status
        FROM applications a
        WHERE a.id = $1
        FOR UPDATE
      `,
      [applicationId],
    );

    if (appRes.rowCount === 0) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }

    const app = appRes.rows[0];

    // Optional: enforce that only related BD or admin can change
    if (actor.role === 'bd' && actor.id !== app.bd_id) {
      const err = new Error('You can only update your own applications');
      err.statusCode = 403;
      throw err;
    }

    await client.query(
      `
        UPDATE applications
        SET current_status = $2,
            last_status_updated_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `,
      [applicationId, newStatus],
    );

    await client.query(
      `
        INSERT INTO application_status_logs (application_id, old_status, new_status, changed_by)
        VALUES ($1, $2, $3, $4)
      `,
      [applicationId, app.current_status, newStatus, actor.id],
    );

    const jaRes = await client.query(
      `
        SELECT id, user_id
        FROM job_assignments
        WHERE job_id = $1 AND bd_id = $2
        LIMIT 1
      `,
      [app.job_id, app.bd_id],
    );

    if (jaRes.rowCount > 0) {
      const assignment = jaRes.rows[0];
      const hasAssignedUser = !!assignment.user_id;
      const mappedStatus = mapApplicationToAssignmentStatus(newStatus, hasAssignedUser);
      if (mappedStatus) {
        await client.query(
          `
            UPDATE job_assignments
            SET status = $2,
                updated_at = NOW()
            WHERE id = $1
          `,
          [assignment.id, mappedStatus],
        );
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function upsertInterview(applicationId, payload, actor) {
  const {
    mode,
    interview_date,
    interview_time,
    duration_minutes,
    link,
    notes,
  } = payload || {};

  const appRes = await query(
    `
      SELECT
        a.id,
        a.job_id,
        a.bd_id,
        ja.id AS job_assignment_id
      FROM applications a
      LEFT JOIN job_assignments ja
        ON ja.job_id = a.job_id
       AND ja.bd_id = a.bd_id
      WHERE a.id = $1
    `,
    [applicationId],
  );

  if (appRes.rowCount === 0) {
    const err = new Error('Application not found');
    err.statusCode = 404;
    throw err;
  }

  const app = appRes.rows[0];
  if (actor.role === 'bd' && actor.id !== app.bd_id) {
    const err = new Error('You can only add interviews for your own applications');
    err.statusCode = 403;
    throw err;
  }

  const existing = await query(
    'SELECT id FROM interviews WHERE application_id = $1 LIMIT 1',
    [applicationId],
  );

  if (existing.rowCount > 0) {
    await query(
      `
        UPDATE interviews
        SET mode = $2,
            interview_date = $3,
            interview_time = $4,
            duration_minutes = $5,
            link = $6,
            notes = $7,
            job_assignment_id = $8,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        existing.rows[0].id,
        mode || null,
        interview_date || null,
        interview_time || null,
        duration_minutes || null,
        link || null,
        notes || null,
        app.job_assignment_id || null,
      ],
    );
    return existing.rows[0].id;
  }

  const insertRes = await query(
    `
      INSERT INTO interviews (
        id,
        application_id,
        job_assignment_id,
        mode,
        interview_date,
        interview_time,
        duration_minutes,
        link,
        notes,
        created_by,
        created_at,
        updated_at
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
        $8,
        $9,
        NOW(),
        NOW()
      )
      RETURNING id
    `,
    [
      applicationId,
      app.job_assignment_id || null,
      mode || null,
      interview_date || null,
      interview_time || null,
      duration_minutes || null,
      link || null,
      notes || null,
      actor.id,
    ],
  );

  return insertRes.rows[0].id;
}

export async function getInterview(applicationId, actor) {
  const res = await query(
    `
      SELECT
        i.id,
        i.mode,
        i.interview_date,
        i.interview_time,
        i.duration_minutes,
        i.link,
        i.notes,
        i.created_by,
        i.created_at,
        i.updated_at
      FROM interviews i
      WHERE i.application_id = $1
      LIMIT 1
    `,
    [applicationId],
  );

  if (res.rowCount === 0) return null;
  return res.rows[0];
}

