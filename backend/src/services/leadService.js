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

  return insertLead({
    job_id: job_id || null,
    job_title,
    company_name,
    job_link,
    status: 'pending',
    assigned_user_id: allowedUserId,
    bd_id: bdId,
  });
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
  const { clause, params: withFilter } = buildDateRangeFilter('l.created_at', range, params);
  params = withFilter;
  const limitIndex = params.length + 1;
  const offsetIndex = params.length + 2;
  params.push(l, offset);

  const dataQuery = `
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
    WHERE l.bd_id = $1
    ${clause}
    ORDER BY l.created_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS count
    FROM leads l
    WHERE l.bd_id = $1
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

export async function listUserLeads(userId, { range, page, limit }) {
  const { page: p, limit: l, offset } = parsePagination({ page, limit });
  let params = [userId];
  const { clause, params: withFilter } = buildDateRangeFilter('l.created_at', range, params);
  params = withFilter;
  const limitIndex = params.length + 1;
  const offsetIndex = params.length + 2;
  params.push(l, offset);

  const dataQuery = `
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
    WHERE l.assigned_user_id = $1
    ${clause}
    ORDER BY l.created_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS count
    FROM leads l
    WHERE l.assigned_user_id = $1
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
  const { clause, params: withFilter } = buildDateRangeFilter('l.created_at', range, params);
  params = withFilter;
  const limitIndex = params.length + 1;
  const offsetIndex = params.length + 2;
  params.push(l, offset);

  const dataQuery = `
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
    WHERE 1=1
    ${clause}
    ORDER BY l.created_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS count
    FROM leads l
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
      FROM leads
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
        SELECT id, job_id, assigned_user_id, bd_id, status
        FROM leads
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
    if (lead.assigned_user_id !== userId) {
      const err = new Error('You can only mark your own leads as applied');
      err.statusCode = 403;
      throw err;
    }

    await client.query(
      `
        UPDATE leads
        SET status = 'applied'
        WHERE id = $1
      `,
      [leadId],
    );

    if (lead.job_id) {
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
            NULL,
            $2,
            $3,
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
        [userId, lead.job_id, lead.bd_id],
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

