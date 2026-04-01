import pool, { query } from '../config/db.js';
import {
  insertLead,
  findLeadById,
  updateLeadAssignment,
  updateLeadStatus,
} from '../repositories/leadRepository.js';
import { buildDateRangeFilter } from '../utils/dateFilter.js';

// job_assignments.status: job_assignment_status enum in 001_initial (pending, assigned, completed, failed)
const ALLOWED_JOB_ASSIGNMENT_STATUSES = new Set(['pending', 'assigned', 'completed', 'failed']);

function parsePagination({ page, limit }) {
  const p = Math.max(parseInt(page || '1', 10), 1);
  const l = Math.min(Math.max(parseInt(limit || '20', 10), 1), 100);
  const offset = (p - 1) * l;
  return { page: p, limit: l, offset };
}

export async function createLeadForBd(bdId, payload, actorRole = 'bd') {
  const {
    job_id,
    job_title,
    company_name,
    job_link,
    job_description,
    assigned_user_id,
  } = payload || {};

  if (!job_title || !company_name || !job_link) {
    const err = new Error('job_title, company_name and job_link are required');
    err.statusCode = 400;
    throw err;
  }

  let allowedUserId = assigned_user_id || null;
  if (assigned_user_id && actorRole === 'bd') {
    const assignRes = await query(
      'SELECT 1 FROM user_bd_assignments WHERE user_id = $1 AND bd_id = $2',
      [assigned_user_id, bdId],
    );
    if (assignRes.rowCount === 0) {
      const err = new Error('You can only assign leads to users assigned to you by admin');
      err.statusCode = 403;
      throw err;
    }
  }

  const lead = await insertLead({
    job_id: job_id || null,
    job_title,
    company_name,
    job_link,
    job_description: typeof job_description === 'string' ? job_description.trim() : null,
    status: allowedUserId ? 'assigned' : 'pending',
    assigned_user_id: allowedUserId,
    bd_id: bdId,
  });

  // If this lead is assigned to a user and they have a profile, upsert an application
  // (applications.profile_id is NOT NULL in 001_initial; current_status uses application_status enum)
  if (allowedUserId && lead?.job_id) {
    const profileRes = await query(
      `SELECT id FROM profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [allowedUserId],
    );
    const profileId = profileRes.rowCount > 0 ? profileRes.rows[0].id : null;
    if (profileId) {
      await query(
        `
          INSERT INTO applications (
            id, user_id, profile_id, job_id, bd_id,
            current_status, applied_at, last_status_updated_at, notes, is_active, created_at, updated_at
          )
          VALUES (gen_random_uuid(), $1, $2, $3, $4, 'applied', NOW(), NOW(), NULL, TRUE, NOW(), NOW())
          ON CONFLICT (user_id, job_id) DO NOTHING
        `,
        [allowedUserId, profileId, lead.job_id, bdId],
      );
    }
  }

  return lead;
}

export async function assignLead(leadId, bdIdOrAdminId, assignedUserId, actorRole) {
  const lead = await findLeadById(leadId);
  if (!lead) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }

  if (actorRole === 'bd' && lead.bd_id !== bdIdOrAdminId) {
    const err = new Error('You can only assign your own leads');
    err.statusCode = 403;
    throw err;
  }

  if (assignedUserId && lead.bd_id) {
    const linkRes = await query(
      'SELECT 1 FROM user_bd_assignments WHERE user_id = $1 AND bd_id = $2',
      [assignedUserId, lead.bd_id],
    );
    if (linkRes.rowCount === 0) {
      const err = new Error(
        'That user is not assigned to this lead\'s BD. Link them in Admin → Users first.',
      );
      err.statusCode = 403;
      throw err;
    }
  }

  const updated = await updateLeadAssignment(leadId, assignedUserId);

  // When a BD/admin assigns a user to a lead, ensure an application row exists
  // so BD can immediately edit application status (applied/interview/acceptance/etc.).
  if (assignedUserId && updated?.job_id) {
    const profileRes = await query(
      `SELECT id FROM profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [assignedUserId],
    );
    const profileId = profileRes.rowCount > 0 ? profileRes.rows[0].id : null;
    if (profileId) {
      await query(
        `
          INSERT INTO applications (
            id, user_id, profile_id, job_id, bd_id,
            current_status, applied_at, last_status_updated_at, notes, is_active, created_at, updated_at
          )
          VALUES (gen_random_uuid(), $1, $2, $3, $4, 'applied', NOW(), NOW(), NULL, TRUE, NOW(), NOW())
          ON CONFLICT (user_id, job_id) DO NOTHING
        `,
        [assignedUserId, profileId, updated.job_id, updated.bd_id],
      );
    }
  }

  // Re-fetch to include application_id / application_status in responses
  const withApplication = await findLeadById(leadId);
  return withApplication || updated;
}

export async function updateLeadStatusService(leadId, newStatus, actor) {
  if (!ALLOWED_JOB_ASSIGNMENT_STATUSES.has(newStatus)) {
    const err = new Error('Invalid lead status');
    err.statusCode = 400;
    throw err;
  }

  const lead = await findLeadById(leadId);
  if (!lead) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }

  if (actor.role === 'bd' && lead.bd_id !== actor.id) {
    const err = new Error('You can only update your own leads');
    err.statusCode = 403;
    throw err;
  }

  // Admin can update any lead.
  const updated = await updateLeadStatus(leadId, newStatus);
  return updated;
}

export async function listBdLeads(bdId, { range, page, limit }) {
  const { page: p, limit: l, offset } = parsePagination({ page, limit });
  let params = [bdId];
  const { clause, params: withFilter } = buildDateRangeFilter('ja.created_at', range, params);
  params = withFilter;
  const limitIndex = params.length + 1;
  const offsetIndex = params.length + 2;
  params.push(l, offset);

  const dataQuery = `
    WITH latest_assignments AS (
      SELECT DISTINCT ON (ja.job_id, ja.user_id, ja.bd_id)
        ja.*
      FROM job_assignments ja
      WHERE ja.bd_id = $1
      ORDER BY ja.job_id, ja.user_id, ja.bd_id, ja.created_at DESC
    )
    SELECT
      ja.id,
      ja.job_id,
      j.title AS job_title,
      j.company_name,
      j.job_url AS job_link,
      j.description AS job_description,
      ja.status,
      ja.user_id AS assigned_user_id,
      ja.bd_id,
      ja.created_at,
      a.id AS application_id,
      a.current_status AS application_status,
      ar.source AS resume_source,
      ar.created_at AS resume_uploaded_at,
      (ar.id IS NOT NULL) AS has_resume
    FROM latest_assignments ja
    JOIN jobs j ON j.id = ja.job_id
    LEFT JOIN applications a
      ON a.job_id = ja.job_id
     AND a.bd_id = ja.bd_id
     AND a.user_id = ja.user_id
    LEFT JOIN application_resumes ar
      ON ar.application_id = a.id
    WHERE 1=1
    ${clause}
    ORDER BY ja.created_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const countQuery = `
    WITH latest_assignments AS (
      SELECT DISTINCT ON (ja.job_id, ja.user_id, ja.bd_id)
        ja.*
      FROM job_assignments ja
      WHERE ja.bd_id = $1
      ORDER BY ja.job_id, ja.user_id, ja.bd_id, ja.created_at DESC
    )
    SELECT COUNT(*)::int AS count
    FROM latest_assignments ja
    WHERE 1=1
    ${clause}
  `;

  const [dataRes, countRes] = await Promise.all([
    query(dataQuery, params),
    query(countQuery, params.slice(0, params.length - 2)),
  ]);

  return {
    items: dataRes.rows,
    total: countRes.rows[0]?.count || 0,
    page: p,
    limit: l,
  };
}

/**
 * List leads for a user: only leads assigned to this user (ja.user_id = userId).
 * Leads must also be from BDs assigned to this user (user_bd_assignments), so users
 * only see their own assigned leads from their BDs.
 */
export async function listUserLeads(userId, { range, page, limit }) {
  const { page: p, limit: l, offset } = parsePagination({ page, limit });
  let params = [userId];
  const { clause, params: withFilter } = buildDateRangeFilter('ja.created_at', range, params);
  params = withFilter;
  const limitIndex = params.length + 1;
  const offsetIndex = params.length + 2;
  params.push(l, offset);

  const dataQuery = `
    WITH latest_assignments AS (
      SELECT DISTINCT ON (ja.job_id, ja.user_id, ja.bd_id)
        ja.*
      FROM job_assignments ja
      WHERE ja.user_id = $1
      ORDER BY ja.job_id, ja.user_id, ja.bd_id, ja.created_at DESC
    )
    SELECT
      ja.id,
      ja.job_id,
      j.title AS job_title,
      j.company_name,
      j.job_url AS job_link,
      j.description AS job_description,
      ja.status,
      ja.user_id AS assigned_user_id,
      ja.bd_id,
      ja.created_at,
      a.id AS application_id,
      a.current_status AS application_status,
      ar.source AS resume_source,
      ar.created_at AS resume_uploaded_at,
      (ar.id IS NOT NULL) AS has_resume,
      i.mode AS interview_mode,
      i.interview_date,
      i.interview_time,
      i.duration_minutes,
      i.timezone AS interview_timezone,
      i.link AS interview_link
    FROM latest_assignments ja
    JOIN jobs j ON j.id = ja.job_id
    JOIN user_bd_assignments uba ON uba.bd_id = ja.bd_id AND uba.user_id = $1
    LEFT JOIN applications a
      ON a.job_id = ja.job_id
     AND a.user_id = ja.user_id
     AND a.bd_id = ja.bd_id
    LEFT JOIN interviews i
      ON i.application_id = a.id
    LEFT JOIN application_resumes ar
      ON ar.application_id = a.id
    WHERE 1=1
    ${clause}
    ORDER BY ja.created_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const countQuery = `
    WITH latest_assignments AS (
      SELECT DISTINCT ON (ja.job_id, ja.user_id, ja.bd_id)
        ja.*
      FROM job_assignments ja
      WHERE ja.user_id = $1
      ORDER BY ja.job_id, ja.user_id, ja.bd_id, ja.created_at DESC
    )
    SELECT COUNT(*)::int AS count
    FROM latest_assignments ja
    JOIN user_bd_assignments uba ON uba.bd_id = ja.bd_id AND uba.user_id = $1
    WHERE 1=1
    ${clause}
  `;

  const [dataRes, countRes] = await Promise.all([
    query(dataQuery, params),
    query(countQuery, params.slice(0, params.length - 2)),
  ]);

  return {
    items: dataRes.rows,
    total: countRes.rows[0]?.count || 0,
    page: p,
    limit: l,
  };
}

export async function listLeadsForAdmin({ range, page, limit }) {
  const { page: p, limit: l, offset } = parsePagination({ page, limit });
  let params = [];
  const { clause, params: withFilter } = buildDateRangeFilter('ja.created_at', range, params);
  params = withFilter;
  const limitIndex = params.length + 1;
  const offsetIndex = params.length + 2;
  params.push(l, offset);

  const dataQuery = `
    SELECT
      ja.id,
      ja.job_id,
      j.title AS job_title,
      j.company_name,
      j.job_url AS job_link,
      ja.status,
      ja.user_id AS assigned_user_id,
      ja.bd_id,
      ja.created_at
    FROM job_assignments ja
    JOIN jobs j ON j.id = ja.job_id
    WHERE 1=1
    ${clause}
    ORDER BY ja.created_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS count
    FROM job_assignments ja
    WHERE 1=1
    ${clause}
  `;

  const [dataRes, countRes] = await Promise.all([
    query(dataQuery, params),
    query(countQuery, params.slice(0, params.length - 2)),
  ]);

  return {
    items: dataRes.rows,
    total: countRes.rows[0]?.count || 0,
    page: p,
    limit: l,
  };
}

// job_assignments.status enum in 001: pending, assigned, completed, failed
export async function getLeadStats() {
  const res = await query(
    `
      SELECT
        COUNT(*)::int AS total_leads,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'assigned')::int AS assigned,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
      FROM job_assignments
    `,
  );
  return res.rows[0] || {
    total_leads: 0,
    pending: 0,
    assigned: 0,
    completed: 0,
    failed: 0,
  };
}

export async function markLeadAppliedByUser(leadId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const leadRes = await client.query(
      `
        SELECT id, job_id, user_id AS assigned_user_id, bd_id, status
        FROM job_assignments
        WHERE id = $1
        FOR UPDATE
      `,
      [leadId],
    );

    if (leadRes.rowCount === 0) {
      const err = new Error('Lead not found');
      err.statusCode = 404;
      throw err;
    }

    const lead = leadRes.rows[0];
    // User can mark as applied if this lead is visible to them (BD is assigned to them via user_bd_assignments)
    const accessRes = await client.query(
      'SELECT 1 FROM user_bd_assignments WHERE user_id = $1 AND bd_id = $2',
      [userId, lead.bd_id],
    );
    if (accessRes.rowCount === 0) {
      const err = new Error('You can only mark leads from your assigned BDs as applied');
      err.statusCode = 403;
      throw err;
    }

    await client.query(
      `UPDATE job_assignments SET status = 'assigned', updated_at = NOW() WHERE id = $1`,
      [leadId],
    );

    if (lead.job_id) {
      const profileRes = await client.query(
        `SELECT id FROM profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [userId],
      );
      const profileId = profileRes.rowCount > 0 ? profileRes.rows[0].id : null;
      if (profileId) {
        await client.query(
          `
            INSERT INTO applications (
              id, user_id, profile_id, job_id, bd_id,
              current_status, applied_at, last_status_updated_at, notes, is_active, created_at, updated_at
            )
            VALUES (gen_random_uuid(), $1, $2, $3, $4, 'applied', NOW(), NOW(), NULL, TRUE, NOW(), NOW())
            ON CONFLICT (user_id, job_id) DO NOTHING
          `,
          [userId, profileId, lead.job_id, lead.bd_id],
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

function ensureLeadAccessForActor(lead, actor) {
  if (!lead) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }

  if (!actor || !actor.id) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }

  if (actor.role === 'user') {
    if (lead.assigned_user_id !== actor.id) {
      const err = new Error('You can only access your own leads');
      err.statusCode = 403;
      throw err;
    }
  } else if (actor.role === 'bd') {
    if (lead.bd_id !== actor.id) {
      const err = new Error('You can only access your own leads');
      err.statusCode = 403;
      throw err;
    }
  } else if (actor.role !== 'admin') {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }
}

export async function getLeadMessagesService(leadId, actor) {
  const lead = await findLeadById(leadId);
  ensureLeadAccessForActor(lead, actor);

  const res = await query(
    `
      SELECT
        lm.id,
        lm.job_assignment_id,
        lm.sender_id,
        lm.sender_role,
        lm.message,
        lm.created_at,
        u.full_name,
        u.email
      FROM lead_messages lm
      JOIN users u ON u.id = lm.sender_id
      WHERE lm.job_assignment_id = $1
      ORDER BY lm.created_at ASC
    `,
    [leadId],
  );

  return {
    lead,
    messages: res.rows || [],
  };
}

export async function addLeadMessageService(leadId, actor, message) {
  const trimmed = (message || '').trim();
  if (!trimmed) {
    const err = new Error('message is required');
    err.statusCode = 400;
    throw err;
  }

  const lead = await findLeadById(leadId);
  ensureLeadAccessForActor(lead, actor);

  const res = await query(
    `
      INSERT INTO lead_messages (
        job_assignment_id,
        sender_id,
        sender_role,
        message,
        created_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING
        id,
        job_assignment_id,
        sender_id,
        sender_role,
        message,
        created_at
    `,
    [leadId, actor.id, actor.role, trimmed],
  );

  return res.rows[0];
}

