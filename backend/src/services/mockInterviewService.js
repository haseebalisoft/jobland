import { query } from '../config/db.js';
import {
  buildInterviewerSystemPrompt,
  generateOpeningMessage,
  streamInterviewReply,
  generateInterviewReportJson,
} from './mockInterviewAiService.js';
import { loadInterviewUserContext } from './mockInterviewContext.js';

function mapScenario(row) {
  if (!row) return null;
  let focus = row.focus_areas;
  if (typeof focus === 'string') {
    try {
      focus = JSON.parse(focus);
    } catch {
      focus = [];
    }
  }
  return {
    ...row,
    focus_areas: Array.isArray(focus) ? focus : [],
  };
}

export async function listScenarios({ category, search, page = 1, limit = 48 }) {
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit, 10) || 48, 1), 100);
  const offset = (p - 1) * l;

  const conditions = ['1=1'];
  const params = [];
  let i = 1;

  if (category && category !== 'All Scenario') {
    conditions.push(`category = $${i}`);
    params.push(category);
    i += 1;
  }

  if (search && String(search).trim()) {
    conditions.push(`(title ILIKE $${i} OR description ILIKE $${i})`);
    params.push(`%${String(search).trim()}%`);
    i += 1;
  }

  const where = conditions.join(' AND ');
  const limitIdx = i;
  const offsetIdx = i + 1;
  params.push(l, offset);

  const dataRes = await query(
    `
      SELECT id, title, description, category, duration_mins, focus_areas, icon_type, is_premium, sort_order, created_at
      FROM interview_scenarios
      WHERE ${where}
      ORDER BY sort_order ASC, title ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `,
    params,
  );

  const countRes = await query(
    `SELECT COUNT(*)::int AS c FROM interview_scenarios WHERE ${where}`,
    params.slice(0, params.length - 2),
  );

  const catRes = await query(
    `SELECT DISTINCT category FROM interview_scenarios ORDER BY category ASC`,
  );

  return {
    scenarios: (dataRes.rows || []).map(mapScenario),
    total: countRes.rows[0]?.c ?? 0,
    page: p,
    limit: l,
    categories: ['All Scenario', ...(catRes.rows || []).map((r) => r.category)],
  };
}

export async function getScenarioById(id) {
  const res = await query(
    `SELECT id, title, description, category, duration_mins, focus_areas, icon_type, is_premium, sort_order, created_at, updated_at FROM interview_scenarios WHERE id = $1`,
    [id],
  );
  return mapScenario(res.rows[0] || null);
}

export async function createSessionForUser(userId, { scenarioId, userContext: userOverrides = {} }) {
  const scenario = await getScenarioById(scenarioId);
  if (!scenario) {
    const err = new Error('Scenario not found');
    err.statusCode = 404;
    throw err;
  }

  const profileCtx = await loadInterviewUserContext(userId);
  if (!profileCtx) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (scenario.is_premium && !profileCtx.isPremium) {
    const err = new Error('This scenario requires a premium plan');
    err.statusCode = 403;
    throw err;
  }

  const merged = {
    ...profileCtx,
    ...userOverrides,
    skills: userOverrides.skills ?? profileCtx.skills,
    name: userOverrides.name || profileCtx.name,
    currentRole: userOverrides.currentRole ?? profileCtx.currentRole,
    targetRole: userOverrides.targetRole ?? profileCtx.targetRole,
    yearsExp: userOverrides.yearsExp ?? profileCtx.yearsExp,
    education: userOverrides.education ?? profileCtx.education,
    summary: userOverrides.summary ?? profileCtx.summary,
  };

  const systemPrompt = buildInterviewerSystemPrompt(scenario, merged, userOverrides);
  const opening = await generateOpeningMessage(systemPrompt);

  const conversation = [
    {
      role: 'assistant',
      content: opening,
      timestamp: new Date().toISOString(),
    },
  ];

  const userContextPayload = {
    candidate: merged,
    systemPrompt,
    scenarioTitle: scenario.title,
    scenarioCategory: scenario.category,
  };

  const ins = await query(
    `
      INSERT INTO interview_sessions (user_id, scenario_id, status, user_context, conversation)
      VALUES ($1, $2, 'active', $3::jsonb, $4::jsonb)
      RETURNING id, user_id, scenario_id, status, started_at, user_context, conversation, created_at
    `,
    [userId, scenarioId, JSON.stringify(userContextPayload), JSON.stringify(conversation)],
  );

  const row = ins.rows[0];
  return {
    sessionId: row.id,
    session: row,
    scenario,
    firstMessage: opening,
    systemPrompt,
  };
}

function conversationToMessages(systemPrompt, conversation) {
  const msgs = [{ role: 'system', content: systemPrompt }];
  for (const turn of conversation || []) {
    if (turn.role === 'user' || turn.role === 'assistant') {
      msgs.push({ role: turn.role, content: turn.content });
    }
  }
  return msgs;
}

export async function appendUserMessageAndStreamAssistant(userId, sessionId, userText) {
  const res = await query(
    `SELECT * FROM interview_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, userId],
  );
  if (res.rowCount === 0) {
    const err = new Error('Session not found');
    err.statusCode = 404;
    throw err;
  }
  const session = res.rows[0];
  if (session.status !== 'active') {
    const err = new Error('Session is not active');
    err.statusCode = 400;
    throw err;
  }

  let uc = session.user_context;
  if (typeof uc === 'string') uc = JSON.parse(uc);
  const systemPrompt = uc.systemPrompt;
  if (!systemPrompt) {
    const err = new Error('Session missing system prompt');
    err.statusCode = 500;
    throw err;
  }

  let conversation = session.conversation;
  if (typeof conversation === 'string') conversation = JSON.parse(conversation);
  if (!Array.isArray(conversation)) conversation = [];

  const userMsg = {
    role: 'user',
    content: String(userText || '').trim(),
    timestamp: new Date().toISOString(),
  };
  if (!userMsg.content) {
    const err = new Error('message is required');
    err.statusCode = 400;
    throw err;
  }

  conversation.push(userMsg);

  await query(
    `UPDATE interview_sessions SET conversation = $2::jsonb, updated_at = NOW() WHERE id = $1 AND user_id = $3`,
    [sessionId, JSON.stringify(conversation), userId],
  );

  const messages = conversationToMessages(systemPrompt, conversation);

  let full = '';
  async function* gen() {
    for await (const chunk of streamInterviewReply(messages)) {
      full += chunk;
      yield chunk;
    }
  }

  return {
    stream: gen(),
    async finalize() {
      const assistantMsg = {
        role: 'assistant',
        content: full.trim(),
        timestamp: new Date().toISOString(),
      };
      conversation.push(assistantMsg);
      await query(
        `UPDATE interview_sessions SET conversation = $2::jsonb, updated_at = NOW() WHERE id = $1 AND user_id = $3`,
        [sessionId, JSON.stringify(conversation), userId],
      );
      const assistantCount = conversation.filter((m) => m.role === 'assistant').length;
      const userCount = conversation.filter((m) => m.role === 'user').length;
      return {
        reply: assistantMsg.content,
        questionCount: assistantCount,
        exchangeCount: userCount,
      };
    },
  };
}

export async function endSession(userId, sessionId) {
  const res = await query(
    `UPDATE interview_sessions SET status = 'completed', ended_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2 AND status = 'active' RETURNING id`,
    [sessionId, userId],
  );
  if (res.rowCount === 0) {
    const err = new Error('Session not found or already ended');
    err.statusCode = 404;
    throw err;
  }
  return { success: true };
}

export async function saveReport(userId, sessionId, reportData) {
  const sessionRes = await query(`SELECT id FROM interview_sessions WHERE id = $1 AND user_id = $2`, [
    sessionId,
    userId,
  ]);
  if (sessionRes.rowCount === 0) {
    const err = new Error('Session not found');
    err.statusCode = 404;
    throw err;
  }

  const overall = Math.min(100, Math.max(0, parseInt(reportData.overallScore, 10) || 0));
  const existing = await query(`SELECT id FROM interview_reports WHERE session_id = $1`, [sessionId]);
  if (existing.rowCount > 0) {
    const upd = await query(
      `
        UPDATE interview_reports SET
          overall_score = $2,
          scores = $3::jsonb,
          strengths = $4::jsonb,
          improvements = $5::jsonb,
          better_answers = $6::jsonb,
          recommendations = $7
        WHERE session_id = $1
        RETURNING id
      `,
      [
        sessionId,
        overall,
        JSON.stringify(reportData.scores || {}),
        JSON.stringify(reportData.strengths || []),
        JSON.stringify(reportData.improvements || []),
        JSON.stringify(reportData.betterAnswers || []),
        reportData.recommendations || null,
      ],
    );
    return { reportId: upd.rows[0].id };
  }

  const ins = await query(
    `
      INSERT INTO interview_reports (
        session_id, user_id, overall_score, scores, strengths, improvements, better_answers, recommendations
      )
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8)
      RETURNING id
    `,
    [
      sessionId,
      userId,
      overall,
      JSON.stringify(reportData.scores || {}),
      JSON.stringify(reportData.strengths || []),
      JSON.stringify(reportData.improvements || []),
      JSON.stringify(reportData.betterAnswers || []),
      reportData.recommendations || null,
    ],
  );

  return { reportId: ins.rows[0].id };
}

// Need unique on session_id for ON CONFLICT - we have UNIQUE index on session_id

export async function buildAndSaveReport(userId, sessionId) {
  const sRes = await query(
    `
      SELECT s.id, s.conversation, s.scenario_id, sc.title AS scenario_title
      FROM interview_sessions s
      JOIN interview_scenarios sc ON sc.id = s.scenario_id
      WHERE s.id = $1 AND s.user_id = $2
    `,
    [sessionId, userId],
  );
  if (sRes.rowCount === 0) {
    const err = new Error('Session not found');
    err.statusCode = 404;
    throw err;
  }
  const s = sRes.rows[0];
  let conv = s.conversation;
  if (typeof conv === 'string') conv = JSON.parse(conv);
  const lines = (conv || []).map((m) => `${m.role?.toUpperCase()}: ${m.content}`);
  const transcript = lines.join('\n\n');

  const report = await generateInterviewReportJson(transcript);

  const normalized = {
    overallScore: report.overallScore ?? report.overall_score ?? 0,
    scores: report.scores || {},
    strengths: report.strengths || [],
    improvements: report.improvements || [],
    betterAnswers: report.betterAnswers || report.better_answers || [],
    recommendations: report.recommendations || '',
  };

  const { reportId } = await saveReport(userId, sessionId, normalized);
  const full = await getReportById(userId, reportId);
  return full;
}

export async function getReportById(userId, reportId) {
  const r = await query(
    `
      SELECT r.*, s.scenario_id, sc.title AS scenario_title
      FROM interview_reports r
      JOIN interview_sessions s ON s.id = r.session_id
      JOIN interview_scenarios sc ON sc.id = s.scenario_id
      WHERE r.id = $1 AND r.user_id = $2
    `,
    [reportId, userId],
  );
  if (r.rowCount === 0) return null;
  return r.rows[0];
}

export async function getReportBySessionId(userId, sessionId) {
  const r = await query(
    `
      SELECT r.*, s.scenario_id, sc.title AS scenario_title
      FROM interview_reports r
      JOIN interview_sessions s ON s.id = r.session_id
      JOIN interview_scenarios sc ON sc.id = s.scenario_id
      WHERE r.session_id = $1 AND r.user_id = $2
    `,
    [sessionId, userId],
  );
  return r.rows[0] || null;
}

export async function getSessionForUser(userId, sessionId) {
  const r = await query(
    `
      SELECT
        s.id,
        s.user_id,
        s.scenario_id,
        s.status,
        s.started_at,
        s.ended_at,
        s.user_context,
        s.conversation,
        sc.title AS scenario_title,
        sc.category AS scenario_category,
        sc.duration_mins,
        sc.description AS scenario_description,
        sc.focus_areas
      FROM interview_sessions s
      JOIN interview_scenarios sc ON sc.id = s.scenario_id
      WHERE s.id = $1 AND s.user_id = $2
    `,
    [sessionId, userId],
  );
  if (r.rowCount === 0) return null;
  const row = r.rows[0];
  let conv = row.conversation;
  if (typeof conv === 'string') conv = JSON.parse(conv);
  let focus = row.focus_areas;
  if (typeof focus === 'string') {
    try {
      focus = JSON.parse(focus);
    } catch {
      focus = [];
    }
  }
  return {
    ...row,
    conversation: conv,
    scenario: {
      id: row.scenario_id,
      title: row.scenario_title,
      category: row.scenario_category,
      duration_mins: row.duration_mins,
      description: row.scenario_description,
      focus_areas: Array.isArray(focus) ? focus : [],
    },
  };
}

export async function listHistory(userId, { page = 1, limit = 20 }) {
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const offset = (p - 1) * l;

  const data = await query(
    `
      SELECT
        s.id,
        s.status,
        s.started_at,
        s.ended_at,
        s.scenario_id,
        sc.title AS scenario_title,
        sc.category AS scenario_category,
        r.overall_score AS score,
        r.id AS report_id
      FROM interview_sessions s
      JOIN interview_scenarios sc ON sc.id = s.scenario_id
      LEFT JOIN interview_reports r ON r.session_id = s.id
      WHERE s.user_id = $1
      ORDER BY s.started_at DESC
      LIMIT $2 OFFSET $3
    `,
    [userId, l, offset],
  );

  const count = await query(`SELECT COUNT(*)::int AS c FROM interview_sessions WHERE user_id = $1`, [userId]);

  return {
    sessions: data.rows || [],
    total: count.rows[0]?.c ?? 0,
    page: p,
    limit: l,
  };
}

/** Persist conversation after streaming (used if finalize fails mid-stream — caller handles) */
export async function updateSessionConversation(sessionId, userId, conversation) {
  await query(
    `UPDATE interview_sessions SET conversation = $3::jsonb, updated_at = NOW() WHERE id = $1 AND user_id = $2`,
    [sessionId, userId, JSON.stringify(conversation)],
  );
}
