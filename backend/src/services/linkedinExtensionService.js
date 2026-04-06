import { query } from '../config/db.js';
import { aiChat } from '../utils/aiHelper.js';

const SECTION_DEFS = [
  { id: 'profile_photo', label: 'Profile Photo', maxScore: 100 },
  { id: 'banner', label: 'Banner', maxScore: 100 },
  { id: 'headline', label: 'Headline', maxScore: 100 },
  { id: 'open_to_work', label: 'Open To Work', maxScore: 100 },
  { id: 'location', label: 'Location', maxScore: 100 },
  { id: 'connections', label: 'Connections', maxScore: 100 },
  { id: 'about', label: 'About/Summary', maxScore: 100 },
  { id: 'experience', label: 'Experience', maxScore: 100 },
  { id: 'education', label: 'Education', maxScore: 100 },
  { id: 'skills', label: 'Skills', maxScore: 100 },
  { id: 'recommendations', label: 'Recommendations', maxScore: 100 },
  { id: 'featured', label: 'Featured', maxScore: 100 },
];

function hasPhoto(url) {
  return !!(url && String(url).trim() && !String(url).includes('ghost'));
}

function scoreFromText(text, minLen, goodLen) {
  const t = String(text || '').trim();
  if (!t) return { score: 0, status: 'critical' };
  if (t.length < minLen) return { score: 35, status: 'improve' };
  if (t.length < goodLen) return { score: 70, status: 'improve' };
  return { score: 95, status: 'complete' };
}

function scoreSection(id, scraped) {
  switch (id) {
    case 'profile_photo':
      return hasPhoto(scraped?.profilePhoto)
        ? { score: 95, status: 'complete' }
        : { score: 15, status: 'critical' };
    case 'banner':
      return hasPhoto(scraped?.banner)
        ? { score: 85, status: scraped.banner?.length > 80 ? 'complete' : 'improve' }
        : { score: 25, status: 'improve' };
    case 'headline': {
      const r = scoreFromText(scraped?.headline, 40, 120);
      if (r.status === 'critical') return { score: 10, status: 'critical' };
      return { score: r.score, status: r.status };
    }
    case 'open_to_work': {
      const otw = scraped?.openToWork;
      if (otw === true) return { score: 90, status: 'complete' };
      if (otw === false) return { score: 40, status: 'improve' };
      return { score: 20, status: 'critical' };
    }
    case 'location': {
      const r = scoreFromText(scraped?.location, 2, 5);
      return { score: r.score, status: r.status === 'critical' ? 'improve' : r.status };
    }
    case 'connections': {
      const n = parseInt(String(scraped?.connectionsCount || '').replace(/\D/g, ''), 10);
      if (!n) return { score: 30, status: 'improve' };
      if (n < 50) return { score: 55, status: 'improve' };
      return { score: 90, status: 'complete' };
    }
    case 'about': {
      const r = scoreFromText(scraped?.about, 80, 400);
      if (r.status === 'critical') return { score: 15, status: 'critical' };
      return { score: r.score, status: r.status };
    }
    case 'experience': {
      const ex = scraped?.experience;
      const list = Array.isArray(ex) ? ex : [];
      if (!list.length) return { score: 10, status: 'critical' };
      const complete = list.filter((e) => e?.title && e?.company).length;
      if (complete >= 2) return { score: 92, status: 'complete' };
      if (complete >= 1) return { score: 65, status: 'improve' };
      return { score: 35, status: 'improve' };
    }
    case 'education': {
      const ed = scraped?.education;
      const list = Array.isArray(ed) ? ed : [];
      if (!list.length) return { score: 20, status: 'critical' };
      return { score: 85, status: 'complete' };
    }
    case 'skills': {
      const sk = scraped?.skills;
      const list = Array.isArray(sk) ? sk : [];
      if (!list.length) return { score: 15, status: 'critical' };
      if (list.length < 5) return { score: 55, status: 'improve' };
      return { score: 90, status: 'complete' };
    }
    case 'recommendations': {
      const n = Number(scraped?.recommendationsCount) || 0;
      if (n >= 3) return { score: 90, status: 'complete' };
      if (n >= 1) return { score: 60, status: 'improve' };
      return { score: 25, status: 'improve' };
    }
    case 'featured': {
      const n = Number(scraped?.featuredCount) || 0;
      if (n >= 1) return { score: 88, status: 'complete' };
      return { score: 30, status: 'improve' };
    }
    default:
      return { score: 50, status: 'improve' };
  }
}

function tipsForSection(id, status) {
  const T = {
    profile_photo: {
      critical: ['Add a clear, professional headshot.'],
      improve: ['Use a high-resolution square image.'],
      complete: ['Great — keep it professional.'],
    },
    banner: {
      critical: [],
      improve: ['Add a banner that reflects your industry or personal brand.'],
      complete: ['Banner looks good.'],
    },
    headline: {
      critical: ['Write a keyword-rich headline with your role and focus area.'],
      improve: ['Add metrics or specialties recruiters search for.'],
      complete: ['Strong headline visibility.'],
    },
    open_to_work: {
      critical: ['Turn on “Open to work” if you are actively searching (optional).'],
      improve: ['Refine job preferences under Open to work.'],
      complete: [],
    },
    location: {
      critical: ['Add your location for local discovery.'],
      improve: [],
      complete: [],
    },
    connections: {
      critical: [],
      improve: ['Grow your network to improve discoverability.'],
      complete: [],
    },
    about: {
      critical: ['Fill the About section with a concise story and keywords.'],
      improve: ['Expand with outcomes and tools you use.'],
      complete: [],
    },
    experience: {
      critical: ['Add at least one role with impact-focused bullets.'],
      improve: ['Quantify achievements in each role.'],
      complete: [],
    },
    education: {
      critical: ['Add your education credentials.'],
      improve: [],
      complete: [],
    },
    skills: {
      critical: ['List core skills recruiters filter on.'],
      improve: ['Add endorsements where relevant.'],
      complete: [],
    },
    recommendations: {
      critical: [],
      improve: ['Request 1–2 recommendations from colleagues.'],
      complete: [],
    },
    featured: {
      critical: [],
      improve: ['Feature posts, links, or media that showcase your work.'],
      complete: [],
    },
  };
  const row = T[id] || {};
  return row[status] || row.improve || [];
}

/**
 * Heuristic LinkedIn profile analysis from extension-scraped JSON.
 */
export function analyzeScrapedProfile(scraped) {
  const sections = SECTION_DEFS.map((def) => {
    const { score, status } = scoreSection(def.id, scraped || {});
    const tips = tipsForSection(def.id, status);
    return {
      name: def.label,
      key: def.id,
      score,
      status,
      tips,
    };
  });
  const overallScore = Math.round(
    sections.reduce((a, s) => a + s.score, 0) / Math.max(sections.length, 1),
  );
  return { overallScore, sections };
}

const SECTION_LIMITS = {
  headline: 220,
  about: 2600,
  default: 600,
};

const SECTION_LABEL = {
  headline: 'headline',
  about: 'About / summary',
  profile_photo: 'profile photo guidance (suggest a short professional positioning line only)',
  banner: 'banner tagline',
  default: 'profile section',
};

function buildGeneratePrompt(section, currentContent, userProfile, linkedinProfile) {
  const limit = SECTION_LIMITS[section] ?? SECTION_LIMITS.default;
  const label = SECTION_LABEL[section] || SECTION_LABEL.default;
  const name = userProfile?.personal?.fullName || userProfile?.name || 'Candidate';
  const role =
    userProfile?.professional?.currentTitle ||
    linkedinProfile?.headline ||
    '';
  const skills = (userProfile?.professional?.skills || []).join(', ') || linkedinProfile?.skills?.join?.(', ') || '';
  const target = userProfile?.professional?.currentTitle || 'your target role';
  return `Generate an optimized LinkedIn ${label} for:
Name: ${name}
Current role / headline: ${role}
Target role: ${target}
Skills: ${skills}

Current ${label} (from LinkedIn):
${String(currentContent || '').slice(0, 8000)}

Rules:
- Return ONLY valid JSON with shape: { "options": [ { "content": "string", "explanation": "string" } ] }
- Exactly 3 options in "options"
- Each "content" must be under ${limit} characters
- Keyword-rich for recruiter search, professional, tailored for target role
- No markdown, no numbered lists inside content unless appropriate for the section`;
}

/**
 * AI: 3 alternative texts for a LinkedIn section.
 */
export async function generateLinkedInSection(section, currentContent, userProfile, linkedinProfile) {
  const userPrompt = buildGeneratePrompt(section, currentContent, userProfile, linkedinProfile);
  const content = await aiChat(
    [
      {
        role: 'system',
        content:
          'You are an expert LinkedIn career coach. Follow the user instructions exactly and output ONLY valid JSON.',
      },
      { role: 'user', content: userPrompt },
    ],
    { response_format: { type: 'json_object' }, temperature: 0.45, max_tokens: 2048 },
  );
  const parsed = JSON.parse(content);
  const options = Array.isArray(parsed.options) ? parsed.options : [];
  const normalized = options.slice(0, 3).map((o) => ({
    content: String(o.content || '').trim(),
    explanation: String(o.explanation || '').trim(),
  }));
  while (normalized.length < 3) {
    normalized.push({ content: '', explanation: '' });
  }
  return { options: normalized };
}

/**
 * Merge scraped LinkedIn data into the user’s primary profile row.
 */
export async function syncLinkedInToProfile(userId, scraped) {
  const profileRes = await query(
    'SELECT id FROM profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId],
  );
  if (profileRes.rowCount === 0) {
    const err = new Error('No profile found. Complete onboarding in Hirdlogic first.');
    err.statusCode = 400;
    throw err;
  }
  const profileId = profileRes.rows[0].id;

  const headline = String(scraped?.headline || '').trim();
  const about = String(scraped?.about || '').trim();
  const location = String(scraped?.location || '').trim();
  const linkedinUrl = String(scraped?.profileUrl || scraped?.linkedinUrl || '').trim() || null;

  await query(
    `
    UPDATE profiles
    SET title = CASE WHEN $2::text IS NOT NULL AND LENGTH(TRIM($2)) > 0 THEN TRIM($2) ELSE title END,
        summary = CASE WHEN $3::text IS NOT NULL AND LENGTH(TRIM($3)) > 0 THEN TRIM($3) ELSE summary END,
        location = CASE WHEN $4::text IS NOT NULL AND LENGTH(TRIM($4)) > 0 THEN TRIM($4) ELSE location END,
        linkedin_url = COALESCE($5, linkedin_url),
        updated_at = NOW()
    WHERE id = $1
    `,
    [profileId, headline || null, about || null, location || null, linkedinUrl],
  );

  return {
    success: true,
    profileId,
    updated: {
      title: !!headline,
      summary: !!about,
      location: !!location,
      linkedin_url: !!linkedinUrl,
    },
  };
}

export function buildChecklistFromAnalysis(analysis) {
  const sections = analysis?.sections || [];
  const items = sections.map((s) => ({
    section: s.key,
    label: s.name,
    completed: s.status === 'complete',
    tips: s.tips || [],
  }));
  return { items };
}
