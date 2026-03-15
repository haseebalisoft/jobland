import { query } from '../config/db.js';
import crypto from 'crypto';

/**
 * GET /bd/analytics – analytics for the current BD's dashboard (BD or admin only).
 */
export async function getBdAnalytics(req, res, next) {
  try {
    const bdId = req.user?.id;
    if (!bdId || (req.user.role !== 'bd' && req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'BD or admin only' });
    }

    const [
      summaryRes,
      byStatusRes,
      last7Res,
      last30Res,
      unassignedRes,
      assignedUsersCountRes,
      overTimeRes,
    ] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS total FROM job_assignments WHERE bd_id = $1`,
        [bdId]
      ),
      query(
        `SELECT status, COUNT(*)::int AS count FROM job_assignments WHERE bd_id = $1 GROUP BY status`,
        [bdId]
      ),
      query(
        `SELECT COUNT(*)::int AS count FROM job_assignments WHERE bd_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
        [bdId]
      ),
      query(
        `SELECT COUNT(*)::int AS count FROM job_assignments WHERE bd_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
        [bdId]
      ),
      query(
        `SELECT COUNT(*)::int AS count FROM job_assignments WHERE bd_id = $1 AND user_id IS NULL`,
        [bdId]
      ),
      query(
        `SELECT COUNT(*)::int AS count FROM user_bd_assignments WHERE bd_id = $1`,
        [bdId]
      ),
      query(
        `SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS count
         FROM job_assignments WHERE bd_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY date_trunc('day', created_at) ORDER BY day`,
        [bdId]
      ),
    ]);

    const leadsByStatus = (byStatusRes.rows || []).reduce(
      (acc, r) => {
        acc[r.status] = r.count;
        return acc;
      },
      { pending: 0, assigned: 0, completed: 0, failed: 0 }
    );

    res.json({
      summary: {
        totalLeads: summaryRes.rows[0]?.total ?? 0,
        assignedUsersCount: assignedUsersCountRes.rows[0]?.count ?? 0,
        unassignedLeadsCount: unassignedRes.rows[0]?.count ?? 0,
      },
      leadsByStatus,
      leadsCreatedLast7Days: last7Res.rows[0]?.count ?? 0,
      leadsCreatedLast30Days: last30Res.rows[0]?.count ?? 0,
      leadsOverTime: (overTimeRes.rows || []).map((r) => ({ date: r.day, count: r.count })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /bd/oneclick-token – get or create OneClick API key for the current BD (for extension).
 * BD copies this key into the OneClick extension so the extension can POST jobs to the API.
 */
export async function getOneClickToken(req, res, next) {
  try {
    const bdId = req.user?.id;
    if (!bdId || (req.user.role !== 'bd' && req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'BD or admin only' });
    }

    const row = await query(
      'SELECT oneclick_api_key FROM users WHERE id = $1',
      [bdId]
    );
    if (row.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    let apiKey = row.rows[0].oneclick_api_key;
    if (!apiKey) {
      apiKey = crypto.randomBytes(32).toString('hex');
      await query(
        'UPDATE users SET oneclick_api_key = $1, updated_at = NOW() WHERE id = $2',
        [apiKey, bdId]
      );
    }

    res.json({
      oneclick_api_key: apiKey,
      message: 'Use this key in the OneClick extension (Settings). Do not share it.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Returns users assigned to this BD by admin (user_bd_assignments where bd_id = current BD's user id).
 * BD's id comes from users table (role='bd'); admin stores that same id when assigning.
 */
export async function getMyUsers(req, res, next) {
  try {
    const bdId = req.user?.id;
    if (!bdId || (req.user.role !== 'bd' && req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'BD or admin only' });
    }

    const result = await query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        (
          SELECT p.title
          FROM profiles p
          WHERE p.user_id = u.id
          ORDER BY p.created_at DESC
          LIMIT 1
        ) AS profile_title
      FROM user_bd_assignments uba
      JOIN users u ON u.id = uba.user_id
      WHERE uba.bd_id = $1
      ORDER BY u.full_name
      `,
      [bdId],
    );
    res.json(Array.isArray(result.rows) ? result.rows : []);
  } catch (err) {
    next(err);
  }
}
