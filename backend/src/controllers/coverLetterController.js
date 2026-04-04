import {
  streamCoverLetterGeneration,
  insertCoverLetter,
  listCoverLetters,
  getCoverLetter,
  saveCoverLetterToDocuments,
} from '../services/coverLetterService.js';

function validateGenerateBody(body) {
  if (!body || typeof body !== 'object') return 'Invalid body';
  const { jobDescription, jobTitle, companyName } = body;
  if (!String(jobDescription || '').trim()) return 'jobDescription is required';
  if (!String(jobTitle || '').trim()) return 'jobTitle is required';
  if (!String(companyName || '').trim()) return 'companyName is required';
  return null;
}

export async function postGenerateCoverLetter(req, res, next) {
  try {
    const errMsg = validateGenerateBody(req.body || {});
    if (errMsg) return res.status(400).json({ message: errMsg });

    const body = req.body;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    let full = '';
    try {
      const stream = await streamCoverLetterGeneration(req.user.id, body);
      for await (const chunk of stream) {
        full += chunk;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
      const row = await insertCoverLetter(req.user.id, {
        jobTitle: body.jobTitle,
        companyName: body.companyName,
        jobDescription: body.jobDescription,
        content: full.trim(),
        profileMode: body.profileMode || null,
      });
      res.write(
        `data: ${JSON.stringify({
          done: true,
          coverLetterId: row.id,
          content: full.trim(),
        })}\n\n`,
      );
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: e.message || 'Generation failed' })}\n\n`);
    }
    res.end();
  } catch (err) {
    next(err);
  }
}

export async function getCoverLetterHistory(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await listCoverLetters(req.user.id, { page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCoverLetterById(req, res, next) {
  try {
    const row = await getCoverLetter(req.user.id, req.params.id);
    if (!row) return res.status(404).json({ message: 'Cover letter not found' });
    res.json({
      id: row.id,
      jobTitle: row.job_title,
      companyName: row.company_name,
      jobDescription: row.job_description,
      content: row.content,
      preview: row.preview,
      profileMode: row.profile_mode,
      createdAt: row.created_at,
    });
  } catch (err) {
    next(err);
  }
}

export async function postSaveCoverLetterToDocuments(req, res, next) {
  try {
    const out = await saveCoverLetterToDocuments(req.user.id, req.params.id);
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
}
