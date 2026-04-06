import {
  analyzeScrapedProfile,
  generateLinkedInSection,
  syncLinkedInToProfile,
  buildChecklistFromAnalysis,
} from '../services/linkedinExtensionService.js';
import { getResumeProfile } from '../services/cvService.js';

export async function postLinkedInAnalyze(req, res, next) {
  try {
    const scraped = req.body?.scrapedProfile ?? req.body;
    const result = analyzeScrapedProfile(scraped || {});
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function postLinkedInGenerate(req, res, next) {
  try {
    const { section, currentContent, userProfile: bodyUserProfile, linkedinProfile } = req.body || {};
    if (!section || typeof section !== 'string') {
      return res.status(400).json({ message: 'section is required' });
    }
    let userProfile = bodyUserProfile;
    if (!userProfile) {
      userProfile = await getResumeProfile(req.user.id);
    }
    const result = await generateLinkedInSection(
      section,
      currentContent,
      userProfile,
      linkedinProfile || {},
    );
    res.json(result);
  } catch (err) {
    if (err.message?.includes('GROQ') || err.message?.includes('GEMINI') || err.message?.includes('configured')) {
      return res.status(503).json({ message: err.message || 'AI not configured' });
    }
    next(err);
  }
}

export async function postLinkedInSyncProfile(req, res, next) {
  try {
    const scraped = req.body?.scrapedProfile ?? req.body;
    if (!scraped || typeof scraped !== 'object') {
      return res.status(400).json({ message: 'scrapedProfile object is required' });
    }
    const out = await syncLinkedInToProfile(req.user.id, scraped);
    res.json(out);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function getLinkedInChecklist(req, res, next) {
  try {
    let scraped = null;
    if (req.query?.scraped) {
      try {
        scraped = JSON.parse(String(req.query.scraped));
      } catch {
        scraped = null;
      }
    }
    const analysis = analyzeScrapedProfile(scraped || {});
    res.json(buildChecklistFromAnalysis(analysis));
  } catch (err) {
    next(err);
  }
}
