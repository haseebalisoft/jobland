const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function getGeminiKey() {
  const k = process.env.GEMINI_API_KEY;
  if (!k || k === 'your_gemini_api_key_here') return null;
  return k;
}

function getGroqKey() {
  const k = process.env.GROQ_API_KEY;
  if (!k || k === 'your_groq_api_key_here') return null;
  return k;
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

/**
 * Gemini: single turn with system instruction. Returns plain text or JSON string.
 */
async function geminiChat(systemPrompt, userPrompt, options = {}) {
  const key = getGeminiKey();
  if (!key) throw new Error('GEMINI_API_KEY not set');
  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 4096,
      ...(options.responseMimeType && { responseMimeType: options.responseMimeType }),
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const responseText = await res.text();

  if (!res.ok) {
    console.error('[Gemini] API failed:', {
      status: res.status,
      statusText: res.statusText,
      body: responseText.slice(0, 500),
      model: GEMINI_MODEL,
    });
    if (res.status === 429 || responseText.includes('quota') || responseText.includes('rate')) {
      throw new Error('Gemini rate limit or quota exceeded.');
    }
    throw new Error(responseText || `Gemini API error: ${res.status}`);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseErr) {
    console.error('[Gemini] Invalid JSON response:', responseText.slice(0, 300));
    throw new Error('Gemini returned invalid JSON');
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    const blockReason = data.candidates?.[0]?.finishReason || data.candidates?.[0]?.safetyRatings;
    console.error('[Gemini] Empty or blocked response:', {
      hasCandidates: !!data.candidates?.length,
      candidate: data.candidates?.[0],
      promptFeedback: data.promptFeedback,
      blockReason: blockReason || 'no text in parts',
    });
    throw new Error('Empty response from Gemini');
  }
  return text;
}

/**
 * Groq: OpenAI-compatible chat. Returns plain text or JSON string.
 */
async function groqChat(messages, options = {}) {
  const key = getGroqKey();
  if (!key) throw new Error('GROQ_API_KEY not set');
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.max_tokens ?? 4096,
      ...(options.response_format && { response_format: options.response_format }),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    if (res.status === 429 || err.includes('rate limit')) {
      throw new Error('Groq rate limit reached.');
    }
    throw new Error(err || `Groq API error: ${res.status}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty response from Groq');
  return content;
}

/**
 * Single AI call: try Gemini first, then Groq. messages = [{ role, content }]. options: temperature, max_tokens, response_format (Groq) or responseMimeType (Gemini 'application/json').
 */
async function aiChat(messages, options = {}) {
  const systemMsg = messages.find((m) => m.role === 'system');
  const userMsg = messages.find((m) => m.role === 'user') || messages[messages.length - 1];
  const systemPrompt = systemMsg?.content || 'You are a helpful assistant.';
  const userPrompt = typeof userMsg?.content === 'string' ? userMsg.content : JSON.stringify(userMsg?.content);

  const wantJson = options.response_format?.type === 'json_object' || options.responseMimeType === 'application/json';

  if (getGeminiKey()) {
    try {
      const out = await geminiChat(systemPrompt, userPrompt, {
        temperature: options.temperature,
        maxOutputTokens: options.max_tokens,
        responseMimeType: wantJson ? 'application/json' : undefined,
      });
      return out;
    } catch (e) {
      console.error('[AI] Gemini failed:', e.message);
      console.log('[AI] Using Groq fallback.');
    }
  }

  if (getGroqKey()) {
    return groqChat(messages, {
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      response_format: wantJson ? { type: 'json_object' } : undefined,
    });
  }

  throw new Error('No AI provider configured. Set GEMINI_API_KEY and/or GROQ_API_KEY in .env');
}

/**
 * Improve professional summary for impact and clarity.
 */
export async function improveSummary(currentSummary, currentRole) {
  try {
    const content = await aiChat(
      [
        {
          role: 'system',
          content:
            'You are a professional CV writer. Rewrite the following professional summary to be impactful, concise, and focused on the person\'s current role. Use strong action verbs and highlight achievements. Return ONLY the new summary text, no preamble.',
        },
        {
          role: 'user',
          content: `Current Role: ${currentRole || 'N/A'}\nSummary to Improve: ${currentSummary || ''}`,
        },
      ]
    );
    return content;
  } catch (err) {
    console.error('AI Summary Improvement Error:', err.message);
    return currentSummary;
  }
}

/**
 * Optimize experience bullet points (STAR, action verbs, quantification).
 */
export async function optimizeExperience(experienceText, role) {
  try {
    const content = await aiChat([
      {
        role: 'system',
        content:
          'You are a professional CV writer. Rewrite the following experience bullet points to be more impactful using the STAR method where possible. Use strong action verbs and quantify achievements. Return ONLY the new bullet points text, preserving newline structure.',
      },
      {
        role: 'user',
        content: `Role: ${role || 'N/A'}\nExperience to Optimize: ${experienceText || ''}`,
      },
    ]);
    return content;
  } catch (err) {
    console.error('AI Experience Optimization Error:', err.message);
    return experienceText;
  }
}

/**
 * Gap analysis: JD vs resume (alignment score, matched/missing keywords, analysis).
 */
export async function analyzeJdResumeGap(profile, jd) {
  const systemPrompt = `You are an ATS and resume-matching expert.
TASK:
1. Extract REQUIRED skills, tools, and responsibilities from the JD.
2. Compare them with the resume.
3. Calculate alignment percentage (0–100).
4. Identify missing but REASONABLE keywords to add.
5. Identify which resume sections need improvement.

RULES:
- Do NOT rewrite anything. Do NOT hallucinate skills.
- Be conservative and realistic.
- Output ONLY valid JSON.

JSON FORMAT:
{
  "alignmentScore": 70,
  "matchedKeywords": ["term present in both JD and resume"],
  "missingKeywords": ["JD term weak or absent on resume"],
  "summaryGaps": [],
  "experienceGaps": [],
  "skillsGaps": [],
  "analysis": "Short 2-sentence summary of the gap."
}

Populate matchedKeywords and missingKeywords with concrete short phrases (skills, tools, responsibilities) from the JD where possible — these lists power the UI "what matched" / "what didn't" views.`;

  const content = await aiChat(
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `RESUME:\n${JSON.stringify(profile, null, 2)}\n\nJOB DESCRIPTION:\n${jd}`,
      },
    ],
    { response_format: { type: 'json_object' }, temperature: 0.1 }
  );
  return JSON.parse(content);
}

/**
 * Full resume optimization for a JD: gap analysis + optimized profile (same JSON shape as input).
 */
export async function optimizeFullResume(profile, jd, gapAnalysis = null) {
  if (!gapAnalysis) {
    gapAnalysis = await analyzeJdResumeGap(profile, jd);
  }

  const systemPrompt = `You are an expert career coach and CV optimizer.
GOAL: Optimize the CV to be a strong match for the Job Description.

STRATEGY:
1. EXPERIENCE: Phrase years of experience to align with JD (e.g. "3+ years" if JD asks for 4).
2. KEYWORDS: Naturally integrate every missing keyword from the gap analysis into summary and bullet points.
3. TECH STACK: Emphasize tools/languages the JD mentions (e.g. React, Python).
4. ACTION: Rewrite bullet points with strong action verbs and quantifiable achievements (STAR).

STRICT RULES:
- Do NOT invent new companies, jobs, or degrees. Only enhance what is in the input.
- You MAY expand existing experience bullets to include JD-relevant keywords.
- Return ONLY a valid JSON object with the same structure as the input profile: personal, professional (currentTitle, summary, skills, workExperience), education, links.`;

  const content = await aiChat(
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `RESUME:\n${JSON.stringify(profile, null, 2)}\n\nJOB DESCRIPTION:\n${jd}\n\nGAP ANALYSIS:\n${JSON.stringify(gapAnalysis, null, 2)}\n\nReturn the COMPLETE updated resume JSON only.`,
      },
    ],
    { response_format: { type: 'json_object' }, temperature: 0.2 }
  );

  const optimized = JSON.parse(content);
  if (!optimized.professional) return profile;
  return optimized;
}

/**
 * Full pipeline: gap analysis + optimized profile.
 */
export async function jdAlignedResume(profile, jd) {
  const gapAnalysis = await analyzeJdResumeGap(profile, jd);
  const optimizedProfile = await optimizeFullResume(profile, jd, gapAnalysis);
  return { gapAnalysis, optimizedProfile };
}

function parseAiJsonObject(content) {
  let t = String(content).trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/s, '');
  }
  return JSON.parse(t);
}

/**
 * Deep ATS-oriented resume analysis (Groq/Gemini via aiChat).
 * Criteria align with backend/docs/ATS_SCORING_CRITERIA.md
 */
export async function analyzeAtsDeepResume(profile) {
  const systemPrompt = `You are an expert ATS (Applicant Tracking System) analyst and technical recruiter.

SCORING FRAMEWORK — use these dimension ids and weights. Each dimension "score" is 0-100.
- keywords_semantic (25%): Role-relevant skills, tools, domain terms; natural placement; synonym-style coverage; detect keyword stuffing (repetition without substance).
- impact_metrics (25%): Quantified results (%, $, counts, time); strong action verbs; outcomes vs duty-only bullets.
- structure_parsing (20%): Clear sections and headings; logical flow in plain text; call out parsing risks if the content suggests tables, multi-column layout, or graphics (infer only from text structure).
- summary_headline (15%): Professional title/headline and summary quality; alignment with stated experience.
- completeness (15%): Contact, skills depth, work history, education, links; consistency across sections.

RULES:
- Judge ONLY from the resume JSON provided. Do not invent employers, degrees, metrics, or dates.
- If the resume is sparse, keep scores honestly low and say so in executiveSummary.
- overallAtsScore is 0-100 and should reflect the weighted dimensions (compute a weighted average or equivalent).
- keywordAnalysis.stuffingRisk must be exactly one of: "low", "medium", "high".
- recommendations: 3-8 items, each with priority "high" | "medium" | "low".

Return ONLY valid JSON with this exact shape:
{
  "overallAtsScore": 0,
  "executiveSummary": "2-3 sentences.",
  "dimensions": [
    {
      "id": "keywords_semantic",
      "label": "Keywords & semantic fit",
      "weightPercent": 25,
      "score": 0,
      "highlights": ["string"],
      "gaps": ["string"]
    }
  ],
  "keywordAnalysis": {
    "strongTerms": ["string"],
    "missingOrWeak": ["string"],
    "stuffingRisk": "low",
    "notes": "string"
  },
  "impactAnalysis": {
    "score": 0,
    "hasQuantifiedBullets": true,
    "examples": ["string"],
    "gaps": ["string"]
  },
  "structureNotes": {
    "score": 0,
    "findings": ["string"],
    "parsingRisks": ["string"]
  },
  "recommendations": [
    { "priority": "high", "text": "string" }
  ]
}

Include exactly five dimensions in "dimensions", one per id above, with matching weightPercent (25,25,20,15,15) and human-readable labels.`;

  const content = await aiChat(
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `RESUME (JSON):\n${JSON.stringify(profile, null, 2)}`,
      },
    ],
    { response_format: { type: 'json_object' }, temperature: 0.15, max_tokens: 4096 }
  );

  return parseAiJsonObject(content);
}
