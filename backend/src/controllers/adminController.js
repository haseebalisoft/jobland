import { query } from '../config/db.js';
import bcrypt from 'bcryptjs';

/** Cached: whether `user_bd_assignments.bd_id` FK points at `bds` or `users`. */
let cachedBdFkTarget = null;

async function getUserBdAssignmentBdFkTarget() {
  if (cachedBdFkTarget) return cachedBdFkTarget;
  try {
    const r = await query(
      `SELECT ccu.table_name AS ref_table
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
       WHERE tc.table_schema = 'public'
         AND tc.table_name = 'user_bd_assignments'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'bd_id'`,
    );
    const row = (r.rows || []).find((x) => x.ref_table === 'bds' || x.ref_table === 'users');
    cachedBdFkTarget = row?.ref_table === 'bds' ? 'bds' : 'users';
  } catch {
    cachedBdFkTarget = 'users';
  }
  return cachedBdFkTarget;
}

async function bdsTableExists() {
  const r = await query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'bds'
     ) AS e`,
  );
  return r.rows[0]?.e === true;
}

/** Resolve admin UI / API id (users.id or bds.id) to the PK we must store in `user_bd_assignments.bd_id`. */
async function resolveBdIdsForAssignment(bdIds) {
  const target = await getUserBdAssignmentBdFkTarget();
  const input = Array.isArray(bdIds) ? bdIds.filter(Boolean) : [];
  const resolved = [];
  const invalid = [];
  const seen = new Set();

  for (const raw of input) {
    const id = String(raw).trim();
    if (!id) continue;

    if (target === 'users') {
      const r = await query(
        `SELECT id FROM users WHERE id = $1::uuid AND role = 'bd' AND is_active = true`,
        [id],
      );
      if (r.rows[0]) {
        const pk = r.rows[0].id;
        if (!seen.has(pk)) {
          seen.add(pk);
          resolved.push(pk);
        }
      } else {
        invalid.push(id);
      }
      continue;
    }

    let pk = null;
    const byPk = await query(`SELECT id FROM bds WHERE id = $1::uuid LIMIT 1`, [id]).catch(() => ({ rows: [] }));
    if (byPk.rows?.[0]) pk = byPk.rows[0].id;

    if (!pk) {
      const byUser = await query(`SELECT id FROM bds WHERE user_id = $1::uuid LIMIT 1`, [id]).catch(() => ({
        rows: [],
      }));
      if (byUser.rows?.[0]) pk = byUser.rows[0].id;
    }

    if (!pk) {
      invalid.push(id);
      continue;
    }
    if (!seen.has(pk)) {
      seen.add(pk);
      resolved.push(pk);
    }
  }

  return { resolved, invalid, target };
}

function assignedBdsJsonSubquery(useBdsJoin) {
  if (!useBdsJoin) {
    return `COALESCE(
      (SELECT json_agg(json_build_object('id', b.id, 'full_name', b.full_name, 'email', b.email))
       FROM user_bd_assignments uba
       JOIN users b ON b.id = uba.bd_id AND b.role = 'bd'
       WHERE uba.user_id = u.id),
      '[]'::json
    )`;
  }
  return `COALESCE(
    (SELECT json_agg(json_build_object('id', sub.id, 'full_name', sub.full_name, 'email', sub.email))
     FROM (
       SELECT DISTINCT COALESCE(u1.id, u2.id) AS id,
              COALESCE(u1.full_name, u2.full_name) AS full_name,
              COALESCE(u1.email, u2.email) AS email
       FROM user_bd_assignments uba
       LEFT JOIN users u1 ON u1.id = uba.bd_id AND u1.role = 'bd'
       LEFT JOIN bds bd ON bd.id = uba.bd_id AND u1.id IS NULL
       LEFT JOIN users u2 ON u2.id = COALESCE(bd.user_id, bd.id) AND u2.role = 'bd'
       WHERE uba.user_id = u.id
         AND COALESCE(u1.id, u2.id) IS NOT NULL
     ) sub),
    '[]'::json
  )`;
}

export async function getUsers(req, res, next) {
  try {
    const useBdsJoin = (await getUserBdAssignmentBdFkTarget()) === 'bds' && (await bdsTableExists());
    const assignedSql = assignedBdsJsonSubquery(useBdsJoin);
    let result;
    try {
      result = await query(
        `
        SELECT u.id, u.full_name AS name, u.email, u.subscription_plan, u.is_active, u.created_at,
               ${assignedSql} AS assigned_bds
        FROM users u
        WHERE (u.role = 'user' OR u.role IS NULL)
        ORDER BY u.created_at DESC
        `,
      );
    } catch {
      result = await query(
        `
        SELECT u.id, u.full_name AS name, u.email, u.subscription_plan, u.is_active, u.created_at,
               ${assignedBdsJsonSubquery(false)} AS assigned_bds
        FROM users u
        WHERE (u.role = 'user' OR u.role IS NULL)
        ORDER BY u.created_at DESC
        `,
      );
    }
    const users = result.rows.map((row) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      email: row.email,
      subscription_plan: row.subscription_plan,
      isBlocked: row.is_active === false,
      created_at: row.created_at,
      assigned_bds: Array.isArray(row.assigned_bds) ? row.assigned_bds : [],
    }));
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function getBds(req, res, next) {
  try {
    const fk = await getUserBdAssignmentBdFkTarget();
    const hasBds = await bdsTableExists();
    if (fk === 'bds' && hasBds) {
      try {
        const result = await query(`
          SELECT b.id, u.full_name, u.email, u.is_active, u.created_at
          FROM bds b
          INNER JOIN users u ON u.id = COALESCE(b.user_id, b.id)
          WHERE u.role = 'bd' AND u.is_active = true
          ORDER BY u.full_name
        `);
        return res.json(result.rows);
      } catch {
        const result = await query(`
          SELECT b.id, u.full_name, u.email, u.is_active, u.created_at
          FROM bds b
          INNER JOIN users u ON u.id = b.id
          WHERE u.role = 'bd' AND u.is_active = true
          ORDER BY u.full_name
        `);
        return res.json(result.rows);
      }
    }
    const result = await query(
      "SELECT id, full_name, email, is_active, created_at FROM users WHERE role = 'bd' AND is_active = true ORDER BY full_name",
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function assignBdToUser(req, res, next) {
  try {
    const { user_id, bd_ids } = req.body || {};
    if (!user_id) {
      return res.status(400).json({ message: 'user_id is required' });
    }
    const adminId = req.user.id;

    const { resolved, invalid, target } = await resolveBdIdsForAssignment(bd_ids);
    if (invalid.length > 0) {
      return res.status(400).json({
        message:
          target === 'bds'
            ? 'One or more BD ids are invalid. Use a row from the BD list (bds table), or ensure a matching bds record exists for that BD user.'
            : 'One or more BD ids are invalid. They must be active users with role BD.',
        invalid_bd_ids: invalid,
      });
    }

    await query('DELETE FROM user_bd_assignments WHERE user_id = $1', [user_id]);

    for (const bd_id of resolved) {
      await query(
        `INSERT INTO user_bd_assignments (user_id, bd_id, assigned_by) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, bd_id) DO NOTHING`,
        [user_id, bd_id, adminId],
      );
    }

    const useBdsJoin = (await getUserBdAssignmentBdFkTarget()) === 'bds' && (await bdsTableExists());
    const assignedSql = assignedBdsJsonSubquery(useBdsJoin);

    let updated;
    try {
      updated = await query(
        `SELECT u.id, u.full_name AS name, u.email, ${assignedSql} AS assigned_bds
         FROM users u WHERE u.id = $1`,
        [user_id],
      );
    } catch {
      updated = await query(
        `SELECT u.id, u.full_name AS name, u.email,
                COALESCE((SELECT json_agg(json_build_object('id', b.id, 'full_name', b.full_name, 'email', b.email))
                          FROM user_bd_assignments uba JOIN users b ON b.id = uba.bd_id AND b.role = 'bd' WHERE uba.user_id = u.id), '[]'::json) AS assigned_bds
         FROM users u WHERE u.id = $1`,
        [user_id],
      );
    }
    const row = updated.rows[0];
    if (!row) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      id: row.id,
      name: row.name,
      email: row.email,
      assigned_bds: Array.isArray(row.assigned_bds) ? row.assigned_bds : [],
    });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({
        message:
          'Assignment failed: BD reference is not valid for this database (foreign key). Refresh the BD list and try again.',
        code: err.code,
      });
    }
    next(err);
  }
}

export async function getSubscriptions(req, res, next) {
  try {
    const result = await query(
      `
      SELECT s.id, s.user_id, s.status, s.current_period_end, s.created_at,
             sp.plan_id, sp.name AS plan_name, sp.price AS plan_price,
             u.email AS user_email, u.full_name AS user_name
      FROM subscriptions s
      JOIN subscription_plans sp ON sp.id = s.subscription_plan_id
      JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
      `
    );
    const subs = (result.rows || []).map((row) => ({
      _id: row.id,
      id: row.id,
      user_id: row.user_id,
      user_email: row.user_email,
      user_name: row.user_name,
      plan_id: row.plan_id,
      plan_name: row.plan_name,
      plan_price: Number(row.plan_price),
      status: row.status,
      current_period_end: row.current_period_end,
      created_at: row.created_at,
    }));
    res.json(subs);
  } catch (err) {
    next(err);
  }
}

export async function blockUser(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `
        UPDATE users
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING id, full_name AS name, email, subscription_plan, is_active
      `,
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const row = result.rows[0];
    const user = {
      _id: row.id,
      id: row.id,
      name: row.name,
      email: row.email,
      subscription_plan: row.subscription_plan,
      isBlocked: row.is_active === false,
    };
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function unblockUser(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `
        UPDATE users
        SET is_active = true, updated_at = NOW()
        WHERE id = $1
        RETURNING id, full_name AS name, email, subscription_plan, is_active
      `,
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const row = result.rows[0];
    const user = {
      _id: row.id,
      id: row.id,
      name: row.name,
      email: row.email,
      subscription_plan: row.subscription_plan,
      isBlocked: row.is_active === false,
    };
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function resetUserPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { password } = req.body || {};

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 6 characters long' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `
        UPDATE users
        SET password_hash = $2,
            is_verified = true,
            is_active = true,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, full_name AS name, email, role, is_active
      `,
      [id, passwordHash],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      isActive: row.is_active === true,
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE subscriptions SET status = 'canceled', updated_at = NOW() WHERE id = $1 RETURNING id, status`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    res.json({ _id: result.rows[0].id, status: result.rows[0].status });
  } catch (err) {
    next(err);
  }
}

export async function adminStats(req, res, next) {
  try {
    const userCountRes = await query('SELECT COUNT(*)::int AS count FROM users');
    const totalUsers = userCountRes.rows[0]?.count || 0;

    const subRes = await query(
      `SELECT COUNT(*)::int AS active_count,
              COALESCE(SUM(sp.price)::numeric, 0) AS revenue
       FROM subscriptions s
       JOIN subscription_plans sp ON sp.id = s.subscription_plan_id
       WHERE s.status = 'active'`
    );
    const activeSubscribers = subRes.rows[0]?.active_count ?? 0;
    const monthlyRevenue = Number(subRes.rows[0]?.revenue ?? 0);

    res.json({ totalUsers, activeSubscribers, monthlyRevenue });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /admin/analytics – rich analytics for admin dashboard overview.
 * Uses existing indexes; optional indexes in 004_admin_analytics_indexes.sql speed up time-series queries.
 */
export async function getAnalytics(req, res, next) {
  try {
    const [
      summaryRes,
      usersByRoleRes,
      usersLast7Res,
      usersLast30Res,
      leadsByStatusRes,
      leadsOverTimeRes,
      subsByPlanRes,
      applicationsByStatusRes,
      countsRes,
    ] = await Promise.all([
      query(
        `SELECT
          (SELECT COUNT(*)::int FROM users) AS total_users,
          (SELECT COUNT(*)::int FROM users WHERE role = 'user' OR role IS NULL) AS total_candidate_users,
          (SELECT COUNT(*)::int FROM users WHERE role = 'bd') AS total_bds,
          (SELECT COUNT(*)::int FROM subscriptions s WHERE s.status = 'active') AS active_subscriptions,
          (SELECT COALESCE(SUM(sp.price)::numeric, 0) FROM subscriptions s JOIN subscription_plans sp ON sp.id = s.subscription_plan_id WHERE s.status = 'active') AS monthly_revenue`
      ),
      query(
        `SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`
      ),
      query(
        `SELECT COUNT(*)::int AS count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`
      ),
      query(
        `SELECT COUNT(*)::int AS count FROM users WHERE created_at >= NOW() - INTERVAL '30 days'`
      ),
      query(
        `SELECT status, COUNT(*)::int AS count FROM job_assignments GROUP BY status`
      ),
      query(
        `SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS count
         FROM job_assignments WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY date_trunc('day', created_at) ORDER BY day`
      ),
      query(
        `SELECT sp.plan_id, sp.name AS plan_name, COUNT(s.id)::int AS count, COALESCE(SUM(sp.price)::numeric, 0) AS revenue
         FROM subscription_plans sp
         LEFT JOIN subscriptions s ON s.subscription_plan_id = sp.id AND s.status = 'active'
         GROUP BY sp.id, sp.plan_id, sp.name, sp.price ORDER BY sp.price`
      ),
      query(
        `SELECT current_status AS status, COUNT(*)::int AS count FROM applications GROUP BY current_status`
      ),
      query(
        `SELECT
          (SELECT COUNT(*)::int FROM profiles) AS total_profiles,
          (SELECT COUNT(*)::int FROM jobs) AS total_jobs,
          (SELECT COUNT(*)::int FROM job_assignments) AS total_leads,
          (SELECT COUNT(*)::int FROM applications) AS total_applications`
      ),
    ]);

    const summary = summaryRes.rows[0] || {};
    const usersByRole = (usersByRoleRes.rows || []).reduce((acc, r) => {
      acc[r.role || 'user'] = r.count;
      return acc;
    }, {});
    const leadsByStatus = (leadsByStatusRes.rows || []).reduce((acc, r) => {
      acc[r.status] = r.count;
      return acc;
    }, { pending: 0, assigned: 0, completed: 0, failed: 0 });
    const applicationsByStatus = (applicationsByStatusRes.rows || []).reduce((acc, r) => {
      acc[r.status] = r.count;
      return acc;
    }, {});

    res.json({
      summary: {
        totalUsers: summary.total_users ?? 0,
        totalCandidateUsers: summary.total_candidate_users ?? 0,
        totalBds: summary.total_bds ?? 0,
        activeSubscriptions: summary.active_subscriptions ?? 0,
        monthlyRevenue: Number(summary.monthly_revenue ?? 0),
      },
      usersByRole,
      usersCreatedLast7Days: usersLast7Res.rows[0]?.count ?? 0,
      usersCreatedLast30Days: usersLast30Res.rows[0]?.count ?? 0,
      leadsByStatus,
      leadsOverTime: (leadsOverTimeRes.rows || []).map((r) => ({ date: r.day, count: r.count })),
      subscriptionsByPlan: (subsByPlanRes.rows || []).map((r) => ({
        plan_id: r.plan_id,
        plan_name: r.plan_name,
        count: r.count,
        revenue: Number(r.revenue ?? 0),
      })),
      applicationsByStatus,
      counts: {
        totalProfiles: countsRes.rows[0]?.total_profiles ?? 0,
        totalJobs: countsRes.rows[0]?.total_jobs ?? 0,
        totalLeads: countsRes.rows[0]?.total_leads ?? 0,
        totalApplications: countsRes.rows[0]?.total_applications ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getPlansAdmin(req, res, next) {
  try {
    const result = await query(
      `SELECT id, plan_id, name, price, currency, billing_interval, description, is_active, created_at
       FROM subscription_plans ORDER BY price ASC`
    );
    const plans = (result.rows || []).map((row) => ({
      _id: row.id,
      id: row.id,
      plan_id: row.plan_id,
      name: row.name,
      price: Number(row.price),
      currency: row.currency || 'USD',
      billing_interval: row.billing_interval || 'per_interview',
      description: row.description || '',
      isActive: row.is_active === true,
      created_at: row.created_at,
    }));
    res.json(plans);
  } catch (err) {
    next(err);
  }
}

export async function createPlanAdmin(req, res, next) {
  try {
    const { plan_id, name, price, currency, billing_interval, description } = req.body || {};
    if (!plan_id || !name || price == null || price === '') {
      return res.status(400).json({ message: 'plan_id, name, and price are required' });
    }
    const result = await query(
      `INSERT INTO subscription_plans (plan_id, name, price, currency, billing_interval, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, plan_id, name, price, currency, billing_interval, description, is_active, created_at`,
      [
        String(plan_id).trim().toLowerCase().replace(/\s+/g, '_'),
        String(name).trim(),
        Number(price),
        (currency && String(currency).trim()) || 'USD',
        (billing_interval && String(billing_interval).trim()) || 'per_interview',
        description != null ? String(description).trim() : null,
      ]
    );
    const row = result.rows[0];
    res.status(201).json({
      _id: row.id,
      id: row.id,
      plan_id: row.plan_id,
      name: row.name,
      price: Number(row.price),
      currency: row.currency || 'USD',
      billing_interval: row.billing_interval || 'per_interview',
      description: row.description || '',
      isActive: row.is_active === true,
      created_at: row.created_at,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'A plan with this plan_id already exists' });
    }
    next(err);
  }
}

export async function updatePlanAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const { name, price, currency, billing_interval, description, is_active } = req.body || {};
    const updates = [];
    const values = [];
    let i = 1;
    if (name !== undefined) {
      updates.push(`name = $${i++}`);
      values.push(String(name).trim());
    }
    if (price !== undefined) {
      updates.push(`price = $${i++}`);
      values.push(Number(price));
    }
    if (currency !== undefined) {
      updates.push(`currency = $${i++}`);
      values.push(String(currency).trim());
    }
    if (billing_interval !== undefined) {
      updates.push(`billing_interval = $${i++}`);
      values.push(String(billing_interval).trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${i++}`);
      values.push(description === '' ? null : String(description).trim());
    }
    if (typeof is_active === 'boolean') {
      updates.push(`is_active = $${i++}`);
      values.push(is_active);
    }
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    values.push(id);
    const result = await query(
      `UPDATE subscription_plans SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING id, plan_id, name, price, currency, billing_interval, description, is_active`,
      values
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    const row = result.rows[0];
    res.json({
      _id: row.id,
      id: row.id,
      plan_id: row.plan_id,
      name: row.name,
      price: Number(row.price),
      currency: row.currency || 'USD',
      billing_interval: row.billing_interval || 'per_interview',
      description: row.description || '',
      isActive: row.is_active === true,
    });
  } catch (err) {
    next(err);
  }
}

export async function setUserPlan(req, res, next) {
  try {
    const { id } = req.params;
    const { plan_id } = req.body || {};
    if (!plan_id) {
      return res.status(400).json({ message: 'plan_id is required' });
    }
    const planCheck = await query('SELECT id FROM subscription_plans WHERE plan_id = $1', [plan_id]);
    if (planCheck.rowCount === 0) {
      return res.status(400).json({ message: 'Invalid plan_id' });
    }
    const result = await query(
      `UPDATE users SET subscription_plan = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, full_name AS name, email, subscription_plan`,
      [plan_id, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      email: row.email,
      subscription_plan: row.subscription_plan,
    });
  } catch (err) {
    next(err);
  }
}

