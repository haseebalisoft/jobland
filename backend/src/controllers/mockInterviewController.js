import {
  listScenarios,
  getScenarioById,
  createSessionForUser,
  getSessionForUser,
  appendUserMessageAndStreamAssistant,
  endSession,
  buildAndSaveReport,
  getReportById,
  getReportBySessionId,
  listHistory,
} from '../services/mockInterviewService.js';

export async function getScenarios(req, res, next) {
  try {
    const { category, search, page, limit } = req.query;
    const result = await listScenarios({ category, search, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getScenario(req, res, next) {
  try {
    const row = await getScenarioById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Scenario not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

export async function getSession(req, res, next) {
  try {
    const row = await getSessionForUser(req.user.id, req.params.id);
    if (!row) return res.status(404).json({ message: 'Session not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

export async function postSession(req, res, next) {
  try {
    const { scenarioId, userContext } = req.body || {};
    if (!scenarioId) return res.status(400).json({ message: 'scenarioId is required' });
    const out = await createSessionForUser(req.user.id, { scenarioId, userContext });
    res.status(201).json({
      sessionId: out.sessionId,
      scenario: out.scenario,
      firstMessage: out.firstMessage,
    });
  } catch (err) {
    next(err);
  }
}

export async function postSessionMessage(req, res, next) {
  try {
    const { message } = req.body || {};
    const sessionId = req.params.id;
    const { stream, finalize } = await appendUserMessageAndStreamAssistant(
      req.user.id,
      sessionId,
      message,
    );

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    try {
      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
      const meta = await finalize();
      res.write(`data: ${JSON.stringify({ done: true, ...meta })}\n\n`);
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: e.message || 'Stream failed' })}\n\n`);
    }
    res.end();
  } catch (err) {
    next(err);
  }
}

export async function putSessionEnd(req, res, next) {
  try {
    const result = await endSession(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function postGenerateReport(req, res, next) {
  try {
    const report = await buildAndSaveReport(req.user.id, req.params.id);
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await listHistory(req.user.id, { page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getReport(req, res, next) {
  try {
    const row = await getReportById(req.user.id, req.params.id);
    if (!row) return res.status(404).json({ message: 'Report not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

export async function getSessionReport(req, res, next) {
  try {
    const row = await getReportBySessionId(req.user.id, req.params.sessionId);
    if (!row) return res.status(404).json({ message: 'Report not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}
