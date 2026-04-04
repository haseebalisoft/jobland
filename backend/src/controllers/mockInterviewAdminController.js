import { query } from '../config/db.js';
import { listScenarios, getScenarioById } from '../services/mockInterviewService.js';

export async function adminGetScenarios(req, res, next) {
  try {
    const result = await listScenarios({ page: 1, limit: 500 });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function adminGetScenario(req, res, next) {
  try {
    const row = await getScenarioById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

export async function adminCreateScenario(req, res, next) {
  try {
    const {
      title,
      description,
      category,
      duration_mins = 25,
      focus_areas = [],
      icon_type = 'technical',
      is_premium = false,
      sort_order = 0,
    } = req.body || {};
    if (!title || !description || !category) {
      return res.status(400).json({ message: 'title, description, category are required' });
    }
    const fa = Array.isArray(focus_areas) ? focus_areas : [];
    const ins = await query(
      `
        INSERT INTO interview_scenarios (
          title, description, category, duration_mins, focus_areas, icon_type, is_premium, sort_order
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
        RETURNING *
      `,
      [title, description, category, duration_mins, JSON.stringify(fa), icon_type, !!is_premium, sort_order],
    );
    res.status(201).json(ins.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function adminUpdateScenario(req, res, next) {
  try {
    const {
      title,
      description,
      category,
      duration_mins,
      focus_areas,
      icon_type,
      is_premium,
      sort_order,
    } = req.body || {};
    const fields = [];
    const params = [];
    let i = 1;
    if (title != null) {
      fields.push(`title = $${i++}`);
      params.push(title);
    }
    if (description != null) {
      fields.push(`description = $${i++}`);
      params.push(description);
    }
    if (category != null) {
      fields.push(`category = $${i++}`);
      params.push(category);
    }
    if (duration_mins != null) {
      fields.push(`duration_mins = $${i++}`);
      params.push(duration_mins);
    }
    if (focus_areas != null) {
      fields.push(`focus_areas = $${i++}::jsonb`);
      params.push(JSON.stringify(Array.isArray(focus_areas) ? focus_areas : []));
    }
    if (icon_type != null) {
      fields.push(`icon_type = $${i++}`);
      params.push(icon_type);
    }
    if (is_premium != null) {
      fields.push(`is_premium = $${i++}`);
      params.push(!!is_premium);
    }
    if (sort_order != null) {
      fields.push(`sort_order = $${i++}`);
      params.push(sort_order);
    }
    if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });
    params.push(req.params.id);
    const upd = await query(
      `UPDATE interview_scenarios SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
      params,
    );
    if (upd.rowCount === 0) return res.status(404).json({ message: 'Not found' });
    res.json(upd.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteScenario(req, res, next) {
  try {
    const del = await query(`DELETE FROM interview_scenarios WHERE id = $1 RETURNING id`, [req.params.id]);
    if (del.rowCount === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function adminListSessions(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
    const offset = (page - 1) * limit;
    const data = await query(
      `
        SELECT
          s.id,
          s.user_id,
          u.full_name AS user_name,
          u.email AS user_email,
          s.scenario_id,
          sc.title AS scenario_title,
          s.status,
          s.started_at,
          s.ended_at,
          r.overall_score AS report_score
        FROM interview_sessions s
        JOIN users u ON u.id = s.user_id
        JOIN interview_scenarios sc ON sc.id = s.scenario_id
        LEFT JOIN interview_reports r ON r.session_id = s.id
        ORDER BY s.started_at DESC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    );
    const c = await query(`SELECT COUNT(*)::int AS n FROM interview_sessions`);
    res.json({ sessions: data.rows, total: c.rows[0]?.n ?? 0, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function adminGetSession(req, res, next) {
  try {
    const s = await query(
      `
        SELECT s.*, sc.title AS scenario_title, u.full_name AS user_name, u.email AS user_email,
               r.id AS report_id, r.overall_score
        FROM interview_sessions s
        JOIN interview_scenarios sc ON sc.id = s.scenario_id
        JOIN users u ON u.id = s.user_id
        LEFT JOIN interview_reports r ON r.session_id = s.id
        WHERE s.id = $1
      `,
      [req.params.id],
    );
    if (s.rowCount === 0) return res.status(404).json({ message: 'Not found' });
    res.json(s.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function adminAnalytics(req, res, next) {
  try {
    const popular = await query(
      `
        SELECT sc.id, sc.title, sc.category, COUNT(s.id)::int AS session_count
        FROM interview_scenarios sc
        LEFT JOIN interview_sessions s ON s.scenario_id = sc.id
        GROUP BY sc.id
        ORDER BY session_count DESC
        LIMIT 20
      `,
    );
    const byCategory = await query(
      `
        SELECT sc.category, COUNT(s.id)::int AS sessions, ROUND(AVG(r.overall_score)::numeric, 1) AS avg_score
        FROM interview_scenarios sc
        LEFT JOIN interview_sessions s ON s.scenario_id = sc.id
        LEFT JOIN interview_reports r ON r.session_id = s.id
        GROUP BY sc.category
        ORDER BY sessions DESC
      `,
    );
    const perDay = await query(
      `
        SELECT date_trunc('day', started_at)::date AS day, COUNT(*)::int AS sessions
        FROM interview_sessions
        WHERE started_at > NOW() - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY 1 ASC
      `,
    );
    const premium = await query(
      `
        SELECT
          COUNT(*) FILTER (WHERE sc.is_premium = TRUE)::int AS premium_sessions,
          COUNT(*)::int AS total_sessions
        FROM interview_sessions s
        JOIN interview_scenarios sc ON sc.id = s.scenario_id
      `,
    );
    const pr = premium.rows[0] || {};
    const totalSessions = parseInt(pr.total_sessions, 10) || 0;
    const premiumSessions = parseInt(pr.premium_sessions, 10) || 0;
    res.json({
      popularScenarios: popular.rows,
      averageScoresByCategory: byCategory.rows,
      sessionsPerDay: perDay.rows,
      premiumConversionRate: totalSessions ? premiumSessions / totalSessions : 0,
    });
  } catch (err) {
    next(err);
  }
}
