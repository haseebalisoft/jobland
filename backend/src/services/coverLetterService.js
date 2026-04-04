import { query } from '../config/db.js';
import { loadInterviewUserContext } from './mockInterviewContext.js';
import { streamInterviewReply } from './mockInterviewAiService.js';
import { fetchLinkedInUserInfo, getValidLinkedInAccessToken } from './linkedinOAuthService.js';
import { createDocumentFromText } from './documentService.js';

const SYSTEM =
  'You are an expert career coach and professional writer. Generate a compelling, personalized cover letter. Output only the letter text, no preamble.';

export async function getSavedResumeText(userId, resumeId) {
  const r = await query(
    `SELECT profile_snapshot_json, title FROM saved_resumes WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
    [resumeId, userId],
  );
  if (r.rowCount === 0) return null;
  const snap = r.rows[0].profile_snapshot_json;
  const text =
    typeof snap === 'string'
      ? snap
      : JSON.stringify(snap, null, 2);
  return { title: r.rows[0].title, text };
}

export async function buildCoverLetterUserPrompt(ctx, body) {
  const {
    jobDescription,
    jobTitle,
    companyName,
    resumeText,
    useLinkedIn,
    resumeId,
  } = body;

  let resumeBlock = '';
  if (resumeText && String(resumeText).trim()) {
    resumeBlock = `\nResume / additional text:\n${String(resumeText).trim()}`;
  } else if (resumeId) {
    const sr = await getSavedResumeText(ctx.userId || body._userId, resumeId);
    if (sr?.text) resumeBlock = `\nSaved resume (${sr.title}):\n${sr.text.slice(0, 12000)}`;
  } else if (useLinkedIn) {
    const uid = body._userId;
    const token = await getValidLinkedInAccessToken(uid);
    if (token) {
      try {
        const info = await fetchLinkedInUserInfo(token);
        resumeBlock = `\nLinkedIn profile: ${JSON.stringify(info, null, 2).slice(0, 8000)}`;
      } catch {
        resumeBlock = '\n(LinkedIn profile could not be fetched.)';
      }
    }
  }

  const p = ctx.profile || ctx;
  const skills = Array.isArray(p.skills) ? p.skills.join(', ') : p.skills || '';
  return `Job Title: ${jobTitle || ''}
Company: ${companyName || ''}
Job Description:
${jobDescription || ''}

Candidate Profile:
Name: ${p.name || ''}
Experience: ${p.yearsExp != null ? `${p.yearsExp} years` : 'not specified'}
Current Role: ${p.currentRole || ''}
Target Role: ${p.targetRole || ''}
Key Skills: ${skills}
Education: ${p.education || ''}
Summary: ${p.summary || ''}
${resumeBlock}

Write a professional 3-4 paragraph cover letter that:
- Opens with a strong hook specific to ${companyName || 'the company'}
- Highlights 2-3 most relevant experiences/skills for this role
- Shows genuine interest in the company and role
- Closes with a clear call to action
- Tone: professional yet personable
- Length: 300-400 words`;
}

export async function buildCoverLetterMessages(userId, body) {
  const profile = await loadInterviewUserContext(userId);
  const ctx = { ...profile, userId };
  const userPrompt = await buildCoverLetterUserPrompt({ ...ctx, profile, _userId: userId }, { ...body, _userId: userId });
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: userPrompt },
  ];
}

export async function insertCoverLetter(userId, payload) {
  const { jobTitle, companyName, jobDescription, content, preview, profileMode } = payload;
  const prev = (content || '').slice(0, 280);
  const ins = await query(
    `
      INSERT INTO cover_letters (user_id, job_title, company_name, job_description, content, preview, profile_mode)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [userId, jobTitle, companyName, jobDescription || null, content, preview || prev, profileMode || null],
  );
  return ins.rows[0];
}

export async function listCoverLetters(userId, { page = 1, limit = 30 }) {
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
  const offset = (p - 1) * l;
  const data = await query(
    `
      SELECT id, job_title, company_name, preview, created_at
      FROM cover_letters
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `,
    [userId, l, offset],
  );
  const c = await query(`SELECT COUNT(*)::int AS n FROM cover_letters WHERE user_id = $1`, [userId]);
  return {
    letters: (data.rows || []).map((r) => ({
      id: r.id,
      jobTitle: r.job_title,
      company: r.company_name,
      preview: r.preview,
      createdAt: r.created_at,
    })),
    total: c.rows[0]?.n ?? 0,
  };
}

export async function getCoverLetter(userId, id) {
  const r = await query(`SELECT * FROM cover_letters WHERE id = $1 AND user_id = $2`, [id, userId]);
  return r.rows[0] || null;
}

export async function streamCoverLetterGeneration(userId, body) {
  const messages = await buildCoverLetterMessages(userId, body);
  return streamInterviewReply(messages);
}

export async function saveCoverLetterToDocuments(userId, coverLetterId) {
  const cl = await getCoverLetter(userId, coverLetterId);
  if (!cl) {
    const err = new Error('Cover letter not found');
    err.statusCode = 404;
    throw err;
  }
  const title = `Cover letter — ${cl.company_name} (${cl.job_title})`.slice(0, 500);
  const doc = await createDocumentFromText(userId, {
    title,
    category: 'Cover Letter',
    description: `Generated for ${cl.company_name}`,
    content: cl.content,
    source_cover_letter_id: cl.id,
  });
  return { documentId: doc.id };
}
