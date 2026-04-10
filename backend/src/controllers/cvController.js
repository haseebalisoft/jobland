import {
  getResumeProfile,
  saveResumeProfile,
  saveFinalizedResume,
  saveUploadedSavedResume,
  listSavedResumesForUser,
  listSavedResumesForBdUser,
  getSavedResumeFileForActor,
  deleteSavedResumeForUser,
} from '../services/cvService.js';
import {
  improveSummary,
  optimizeExperience,
  jdAlignedResume,
  analyzeJdResumeGap,
  analyzeAtsDeepResume,
} from '../utils/aiHelper.js';
import { parseCVWithAI } from '../utils/aiParser.js';
import { buildResumePdf } from '../services/pdfService.js';

const multer = (await import('multer')).default;
const upload = multer({ storage: multer.memoryStorage() });
const uploadSavedPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/** Enough resume text to compare to a JD (avoids matching against an empty/minimal profile). */
function profileHasSubstanceForJobMatch(profile) {
  if (!profile || typeof profile !== 'object') return false;
  const personal = profile.personal || {};
  const prof = profile.professional || {};
  const summary = String(prof.summary || '').trim();
  const skills = Array.isArray(prof.skills) ? prof.skills.filter((s) => String(s).trim().length > 0) : [];
  const work = Array.isArray(prof.workExperience) ? prof.workExperience : [];
  if (work.length >= 1) {
    const w = work[0];
    const desc = String(w.description || '').trim();
    const company = String(w.company || '').trim();
    const role = String(w.role || '').trim();
    if (desc.length >= 50) return true;
    if (company.length >= 1 && role.length >= 1 && desc.length >= 25) return true;
  }
  if (summary.length >= 80) return true;
  if (skills.length >= 5) return true;
  if (skills.length >= 3 && summary.length >= 40) return true;
  if (String(personal.fullName || '').trim().length >= 2 && summary.length >= 120) return true;
  return false;
}

function hasResumePdfOnRecord(profile) {
  return !!(profile && profile.resumeUploadedAt);
}

export async function getCvProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const profile = await getResumeProfile(userId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function saveCvProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const body = req.body || {};
    await saveResumeProfile(userId, body);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function improveSummaryHandler(req, res, next) {
  try {
    const { summary, role } = req.body || {};
    const improved = await improveSummary(summary, role);
    res.json({ improved });
  } catch (err) {
    console.error('Improve summary error:', err);
    res.status(500).json({ error: err.message || 'Failed to improve summary' });
  }
}

export async function optimizeExperienceHandler(req, res, next) {
  try {
    const { description, role } = req.body || {};
    const optimized = await optimizeExperience(description, role);
    res.json({ optimized });
  } catch (err) {
    console.error('Optimize experience error:', err);
    res.status(500).json({ error: err.message || 'Failed to optimize experience' });
  }
}

export async function optimizeFullResumeHandler(req, res, next) {
  try {
    const { jd, profile: bodyProfile } = req.body || {};
    if (!jd || !String(jd).trim()) {
      return res.status(400).json({ error: 'Job description (jd) is required' });
    }
    const userId = req.user.id;
    const serverProfile = await getResumeProfile(userId);

    /** Resume builder sends the in-editor profile; free-tier / extension may omit it and rely on server + PDF. */
    let profile;
    if (bodyProfile && typeof bodyProfile === 'object') {
      if (!profileHasSubstanceForJobMatch(bodyProfile)) {
        return res.status(400).json({
          error:
            'Your resume is too thin to tailor. Add work experience, a summary, or skills in the editor (or upload a PDF on ATS & match).',
          code: 'PROFILE_TOO_THIN',
        });
      }
      profile = bodyProfile;
    } else {
      if (!hasResumePdfOnRecord(serverProfile)) {
        return res.status(400).json({
          error: 'Upload a resume PDF first (ATS & match → Upload resume). Job match uses your parsed resume only.',
          code: 'RESUME_NOT_UPLOADED',
        });
      }
      if (!profileHasSubstanceForJobMatch(serverProfile)) {
        return res.status(400).json({
          error: 'Your saved resume is too thin to compare. Re-upload a clearer PDF or add experience in Profile.',
          code: 'PROFILE_TOO_THIN',
        });
      }
      profile = serverProfile;
    }

    const result = await jdAlignedResume(profile, jd);
    res.json(result);
  } catch (err) {
    console.error('Optimize full resume error:', err);
    res.status(500).json({ error: err.message || 'Failed to optimize resume' });
  }
}

/** Deep ATS analysis (Groq/Gemini) — keywords, impact, structure; see docs/ATS_SCORING_CRITERIA.md */
export async function atsDeepAnalysisHandler(req, res, next) {
  try {
    const { profile, rawResumeText } = req.body || {};
    if (!profile || typeof profile !== 'object') {
      return res.status(400).json({ error: 'Profile is required' });
    }
    const analysis = await analyzeAtsDeepResume(profile, {
      rawResumeText: typeof rawResumeText === 'string' ? rawResumeText : undefined,
    });
    res.json(analysis);
  } catch (err) {
    console.error('ATS deep analysis error:', err);
    if (err.message && (err.message.includes('rate limit') || err.message.includes('GROQ'))) {
      return res.status(429).json({ error: err.message, code: 'RATE_LIMIT' });
    }
    res.status(500).json({ error: err.message || 'ATS analysis failed' });
  }
}

/** Gap analysis only (no optimized profile) — for free-tier job match UI. */
export async function jobMatchOnlyHandler(req, res, next) {
  try {
    const { jd, profile: bodyProfile } = req.body || {};
    if (!jd || !String(jd).trim()) {
      return res.status(400).json({ error: 'Job description (jd) is required' });
    }
    const userId = req.user.id;
    const serverProfile = await getResumeProfile(userId);

    let profile;
    if (bodyProfile && typeof bodyProfile === 'object') {
      if (!profileHasSubstanceForJobMatch(bodyProfile)) {
        return res.status(400).json({
          error:
            'Your resume is too thin to compare. Add work experience, a summary, or skills (or upload a PDF on ATS & match).',
          code: 'PROFILE_TOO_THIN',
        });
      }
      profile = bodyProfile;
    } else {
      if (!hasResumePdfOnRecord(serverProfile)) {
        return res.status(400).json({
          error: 'Upload a resume PDF first (ATS & match → Upload resume). Job match uses your parsed resume only.',
          code: 'RESUME_NOT_UPLOADED',
        });
      }
      if (!profileHasSubstanceForJobMatch(serverProfile)) {
        return res.status(400).json({
          error: 'Your saved resume is too thin to compare. Re-upload a clearer PDF or add experience in Profile.',
          code: 'PROFILE_TOO_THIN',
        });
      }
      profile = serverProfile;
    }

    const gapAnalysis = await analyzeJdResumeGap(profile, jd);
    res.json({ gapAnalysis });
  } catch (err) {
    console.error('Job match analysis error:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze job match' });
  }
}

export async function listTemplates(req, res, next) {
  try {
    // Keep the templates endpoint for now; all options use the same
    // underlying pdfkit layout after reverting away from LaTeX.
    res.json([
      { id: 'classic', name: 'Classic' },
      { id: 'modern', name: 'Modern' },
      { id: 'professional', name: 'Professional' },
      { id: 'executive', name: 'Executive' },
      { id: 'minimal', name: 'Minimal' },
      { id: 'dynamics', name: 'Dynamics' },
    ]);
  } catch (err) {
    next(err);
  }
}

export async function previewPdf(req, res, next) {
  try {
    const { profile, customization } = req.body || {};
    if (!profile) {
      return res.status(400).json({ error: 'Profile is required' });
    }
    const buffer = await buildResumePdf(profile, customization || {});
    res.setHeader('Content-Type', 'application/pdf');
    const name = (profile.personal?.fullName || 'Resume').replace(/\s+/g, '_');
    res.setHeader('Content-Disposition', `inline; filename="Resume_${name}.pdf"`);
    res.send(buffer);
  } catch (err) {
    console.error('PDF preview error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate PDF' });
  }
}

export async function downloadPdf(req, res, next) {
  try {
    const { profile, customization } = req.body || {};
    if (!profile) {
      return res.status(400).json({ error: 'Profile is required' });
    }
    const buffer = await buildResumePdf(profile, customization || {});
    res.setHeader('Content-Type', 'application/pdf');
    const name = (profile.personal?.fullName || 'Resume').replace(/\s+/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="Resume_${name}.pdf"`);
    res.send(buffer);
  } catch (err) {
    console.error('PDF download error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate PDF' });
  }
}

export async function parseCv(req, res, next) {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({ message: 'No resume file uploaded' });
    }

    let text = '';
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(file.buffer);
      text = data.text || '';
    } catch (e) {
      console.warn('pdf-parse failed:', e.message);
      text = '';
    }
    if (!text || text.trim().length < 20) {
      return res.status(400).json({ message: 'Could not extract enough text from the PDF' });
    }

    const profileData = await parseCVWithAI(text);
    const userId = req.user.id;
    await saveResumeProfile(userId, profileData, { markResumeParsed: true });

    const saved = await getResumeProfile(userId);
    res.json({
      ...saved,
      extractedText: text.slice(0, 120000),
    });
  } catch (err) {
    console.error('CV parse error:', err);
    if (err.statusCode === 503) {
      return res.status(503).json({
        error: err.message || 'AI parsing is unavailable.',
        code: 'AI_PARSE_UNAVAILABLE',
      });
    }
    if (err.message && (err.message.includes('rate limit') || err.message.includes('GROQ'))) {
      return res.status(429).json({
        error: 'AI service limit reached. Try again later or add GROQ_API_KEY.',
        code: 'RATE_LIMIT',
      });
    }
    res.status(500).json({ error: err.message || 'Failed to parse CV' });
  }
}

export function attachParseUpload() {
  return upload.single('resume');
}

export async function saveFinalizedResumeHandler(req, res, next) {
  try {
    const actor = req.user;
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });
    if (actor.role !== 'user') {
      return res.status(403).json({ message: 'Only users can save finalized resumes.' });
    }
    const { title, profile } = req.body || {};
    const created = await saveFinalizedResume(actor.id, title, profile, actor);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

export async function listMySavedResumesHandler(req, res, next) {
  try {
    const actor = req.user;
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });
    const items = await listSavedResumesForUser(actor.id);
    res.json(items);
  } catch (err) {
    next(err);
  }
}

export async function listBdUserSavedResumesHandler(req, res, next) {
  try {
    const actor = req.user;
    if (!actor || (actor.role !== 'bd' && actor.role !== 'admin')) {
      return res.status(403).json({ message: 'BD or admin only' });
    }
    const { userId } = req.params;
    const items = actor.role === 'admin'
      ? await listSavedResumesForUser(userId)
      : await listSavedResumesForBdUser(actor.id, userId);
    res.json(items);
  } catch (err) {
    next(err);
  }
}

export const uploadSavedResumeMiddleware = uploadSavedPdf.single('resume');

export async function uploadSavedResumeHandler(req, res, next) {
  try {
    const actor = req.user;
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });
    if (actor.role !== 'user') {
      return res.status(403).json({ message: 'Only users can upload saved resumes here.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'resume PDF file is required' });
    }
    const title = (req.body?.title && String(req.body.title).trim()) || (req.file?.originalname || 'Uploaded resume').replace(/\.pdf$/i, '');
    const created = await saveUploadedSavedResume(actor.id, title, req.file, actor);
    res.status(201).json(created);
  } catch (err) {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Resume file must be 5MB or smaller.' });
    }
    next(err);
  }
}

export async function getSavedResumeFileHandler(req, res, next) {
  try {
    const actor = req.user;
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    const file = await getSavedResumeFileForActor(id, actor);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`);
    res.sendFile(file.absolutePath);
  } catch (err) {
    next(err);
  }
}

export async function deleteSavedResumeHandler(req, res, next) {
  try {
    const actor = req.user;
    if (!actor) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    await deleteSavedResumeForUser(id, actor);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
