import pool from '../config/db.js';
import { saveFinalizedResume } from './cvService.js';
import { parseCVWithAI } from '../utils/aiParser.js';
import { generateResumeProfileFromPrompt } from '../utils/aiHelper.js';
import {
  fetchLinkedInUserInfo,
  getValidLinkedInAccessToken,
} from './linkedinOAuthService.js';

async function getUserBasics(userId) {
  const r = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [userId]);
  return r.rows[0] || {};
}

/**
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @param {string} originalname
 */
export async function extractResumeText(buffer, mimetype, originalname) {
  const lower = (originalname || '').toLowerCase();
  if (mimetype === 'application/pdf' || lower.endsWith('.pdf')) {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return String(data.text || '').trim();
  }
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lower.endsWith('.docx')
  ) {
    const mammoth = await import('mammoth');
    const extractRawText = mammoth.default?.extractRawText || mammoth.extractRawText;
    const result = await extractRawText({ buffer });
    return String(result.value || '').trim();
  }
  if (mimetype === 'application/msword' || lower.endsWith('.doc')) {
    const err = new Error('Legacy .doc format is not supported. Please save as .docx or PDF.');
    err.statusCode = 400;
    throw err;
  }
  const err = new Error('Unsupported file type. Use PDF or DOCX.');
  err.statusCode = 400;
  throw err;
}

export async function createResumeFromUpload(userId, file, nameHint, actor) {
  if (!file?.buffer) {
    const err = new Error('file is required');
    err.statusCode = 400;
    throw err;
  }
  const baseTitle =
    (nameHint && String(nameHint).trim()) ||
    (file.originalname || 'resume').replace(/\.(pdf|docx|doc)$/i, '') ||
    'Uploaded resume';
  const text = await extractResumeText(file.buffer, file.mimetype, file.originalname);
  if (!text || text.length < 20) {
    const err = new Error('Could not extract enough text from the file. Try a different PDF or DOCX.');
    err.statusCode = 400;
    throw err;
  }
  const profileData = await parseCVWithAI(text);
  const created = await saveFinalizedResume(userId, String(baseTitle).slice(0, 250), profileData, actor);
  return {
    resumeId: created.id,
    name: created.title,
    extractedData: profileData,
  };
}

export async function createBlankResume(userId, body, actor) {
  const type = body?.type === 'tailored' ? 'tailored' : 'base';
  const u = await getUserBasics(userId);
  const profile = {
    personal: {
      fullName: u.full_name || '',
      email: u.email || '',
      phone: '',
      location: '',
    },
    professional: {
      currentTitle: '',
      summary: '',
      skills: [],
      workExperience: [],
    },
    education: [],
    links: { linkedin: '', github: '', portfolio: '' },
  };
  const title = type === 'tailored' ? 'New tailored resume' : 'New resume';
  const created = await saveFinalizedResume(userId, title, profile, actor);
  return {
    resumeId: created.id,
    name: created.title,
    createdAt: created.created_at,
    type,
    source: body?.source || 'blank',
  };
}

export async function createResumeFromAiPrompt(userId, prompt, actor) {
  const profile = await generateResumeProfileFromPrompt(prompt);
  const u = await getUserBasics(userId);
  if (!profile.personal?.email && u.email) {
    profile.personal = { ...profile.personal, email: u.email };
  }
  if (!profile.personal?.fullName && u.full_name) {
    profile.personal = { ...profile.personal, fullName: u.full_name };
  }
  const title = `${profile.personal?.fullName || 'AI'} resume`.slice(0, 250);
  const created = await saveFinalizedResume(userId, title, profile, actor);
  return {
    resumeId: created.id,
    name: created.title,
    generatedData: profile,
  };
}

export async function createResumeFromLinkedIn(userId, actor) {
  const token = await getValidLinkedInAccessToken(userId);
  if (!token) {
    const err = new Error('LINKEDIN_NOT_CONNECTED');
    err.code = 'LINKEDIN_NOT_CONNECTED';
    err.statusCode = 400;
    throw err;
  }
  const info = await fetchLinkedInUserInfo(token);
  const u = await getUserBasics(userId);
  const profile = {
    personal: {
      fullName: info.name || u.full_name || '',
      email: info.email || u.email || '',
      phone: '',
      location: '',
    },
    professional: {
      currentTitle: '',
      summary:
        'Imported from LinkedIn. Add your headline, experience, and education in the editor to complete your resume.',
      skills: [],
      workExperience: [],
    },
    education: [],
    links: { linkedin: '', github: '', portfolio: '' },
  };
  const title = `${profile.personal.fullName || 'LinkedIn'} resume`.slice(0, 250);
  const created = await saveFinalizedResume(userId, title, profile, actor);
  return {
    resumeId: created.id,
    name: created.title,
    prefillData: profile,
  };
}
