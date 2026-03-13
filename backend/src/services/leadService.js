import pool, { query } from '../config/db.js';
import {
  insertLead,
  findLeadById,
  updateLeadAssignment,
  updateLeadStatus,
} from '../repositories/leadRepository.js';
import { buildDateRangeFilter } from '../utils/dateFilter.js';

const ALLOWED_STATUSES = new Set(['pending', 'applied', 'interview', 'rejected', 'offer']);

function parsePagination({ page, limit }) {
  const p = Math.max(parseInt(page || '1', 10), 1);
  const l = Math.min(Math.max(parseInt(limit || '20', 10), 1), 100);
  const offset = (p - 1) * l;
  return { page: p, limit: l, offset };
}

export async function createLeadForBd(bdId, payload, actorRole = 'bd') {
  const { job_id, job_title, company_name, job_link, assigned_user_id } = payload || {};

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
    status: 'pending',
    assigned_user_id: allowedUserId,
    bd_id: bdId,
  });

  // If this lead is already assigned to a specific user, also upsert an application
  // so the user's applications table stays in sync.
  if (allowedUserId && lead?.job_id) {
    // Find the latest profile for this user (if any)
    const profileRes = await query(
      `
        SELECT id
        FROM profiles
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [allowedUserId],
    );
    const profileId = profileRes.rowCount > 0 ? profileRes.rows[0].id : null;

    await query(
      `
        INSERT INTO applications (
          id,
          user_id,
          profile_id,
          job_id,
          bd_id,
          current_status,
          applied_at,
          last_status_updated_at,
          notes,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          'applied',
          NOW(),
          NOW(),
          NULL,
          TRUE,
          NOW(),
          NOW()
        )
        ON CONFLICT (user_id, job_id) DO NOTHING
      `,
      [allowedUserId, profileId, lead.job_id, bdId],
    );
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

  const updated = await updateLeadAssignment(leadId, assignedUserId);
  return updated;
}

export async function updateLeadStatusService(leadId, newStatus, actor) {
  if (!ALLOWED_STATUSES.has(newStatus)) {
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
    WHERE ja.bd_id = $1
    ${clause}
    ORDER BY ja.created_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS count
    FROM job_assignments ja
    WHERE ja.bd_id = $1
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
 * List leads visible to a user: all leads created by BDs who are assigned to this user
 * via user_bd_assignments (admin assigns users to BDs). Uses existing table structure.
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
    JOIN user_bd_assignments uba ON uba.bd_id = ja.bd_id AND uba.user_id = $1
    WHERE 1=1
    ${clause}
    ORDER BY ja.created_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS count
    FROM job_assignments ja
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

export async function getLeadStats() {
  const res = await query(
    `
      SELECT
        COUNT(*)::int AS total_leads,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'applied')::int AS applied,
        COUNT(*) FILTER (WHERE status = 'interview')::int AS interview,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE status = 'offer')::int AS offer
      FROM job_assignments
    `,
  );
  return res.rows[0] || {
    total_leads: 0,
    pending: 0,
    applied: 0,
    interview: 0,
    rejected: 0,
    offer: 0,
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
      `
        UPDATE job_assignments
        SET status = 'applied'
        WHERE id = $1
      `,
      [leadId],
    );

    if (lead.job_id) {
      // Use the latest profile for this user if it exists
      const profileRes = await client.query(
        `
          SELECT id
          FROM profiles
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [userId],
      );
      const profileId = profileRes.rowCount > 0 ? profileRes.rows[0].id : null;

      await client.query(
        `
          INSERT INTO applications (
            id,
            user_id,
            profile_id,
            job_id,
            bd_id,
            current_status,
            applied_at,
            last_status_updated_at,
            notes,
            is_active,
            created_at,
            updated_at
          )
          VALUES (
            gen_random_uuid(),
            $1,
            $2,
            $3,
            $4,
            'applied',
            NOW(),
            NOW(),
            NULL,
            TRUE,
            NOW(),
            NOW()
          )
          ON CONFLICT (user_id, job_id) DO NOTHING
        `,
        [userId, profileId, lead.job_id, lead.bd_id],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

