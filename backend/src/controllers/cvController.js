import { getResumeProfile, saveResumeProfile } from '../services/cvService.js';
import { improveSummary, optimizeExperience, jdAlignedResume } from '../utils/aiHelper.js';
import { parseCVWithAI } from '../utils/aiParser.js';
import { buildResumePdf } from '../services/pdfService.js';

const multer = (await import('multer')).default;
const upload = multer({ storage: multer.memoryStorage() });

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
    const { profile, jd } = req.body || {};
    if (!profile || !jd) {
      return res.status(400).json({ error: 'Profile and job description (jd) are required' });
    }
    const result = await jdAlignedResume(profile, jd);
    res.json(result);
  } catch (err) {
    console.error('Optimize full resume error:', err);
    res.status(500).json({ error: err.message || 'Failed to optimize resume' });
  }
}

export async function listTemplates(req, res, next) {
  try {
    res.json([
      { id: 'classic', name: 'Classic' },
      { id: 'modern', name: 'Modern' },
    ]);
  } catch (err) {
    next(err);
  }
}

export async function downloadPdf(req, res, next) {
  try {
    const { profile } = req.body || {};
    if (!profile) {
      return res.status(400).json({ error: 'Profile is required' });
    }
    const buffer = await buildResumePdf(profile);
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
    await saveResumeProfile(userId, profileData);

    res.json(profileData);
  } catch (err) {
    console.error('CV parse error:', err);
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
