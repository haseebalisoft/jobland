import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = path.join(__dirname, '../../prompts/cv_to_profile.txt');

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

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

async function geminiJson(systemPrompt, userPrompt) {
  const key = getGeminiKey();
  if (!key) return null;
  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    }),
  });
  const responseText = await res.text();

  if (!res.ok) {
    console.error('[CV Parse][Gemini] API failed:', {
      status: res.status,
      statusText: res.statusText,
      body: responseText.slice(0, 500),
      model: GEMINI_MODEL,
    });
    throw new Error(`Gemini: ${res.status} - ${responseText.slice(0, 200)}`);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseErr) {
    console.error('[CV Parse][Gemini] Invalid JSON:', responseText.slice(0, 300));
    throw new Error('Gemini invalid JSON');
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    console.error('[CV Parse][Gemini] Empty or blocked:', {
      promptFeedback: data.promptFeedback,
      candidate: data.candidates?.[0],
    });
    throw new Error('Empty Gemini response');
  }
  return JSON.parse(text);
}

const GROQ_MODEL_PRIMARY = 'llama-3.3-70b-versatile';
const GROQ_MODEL_FALLBACK = 'llama-3.1-8b-instant';

async function groqJson(systemPrompt, userPrompt, model = GROQ_MODEL_PRIMARY) {
  const key = getGroqKey();
  if (!key) return null;
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 8192,
    }),
  });
  if (!res.ok) throw new Error(`Groq: ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty Groq response');
  return JSON.parse(content);
}

const EMPTY_PROFILE = {
  personal: { fullName: '', firstName: '', lastName: '', email: '', phone: '', location: '' },
  professional: { currentTitle: '', totalExperience: '', skills: [], summary: '', workExperience: [] },
  education: [],
  links: { linkedin: '', github: '', portfolio: '' },
};

const MAX_CV_CHARS = 100000;

export async function parseCVWithAI(text) {
  if (!text || text.trim().length < 20) {
    throw new Error('Too little text extracted from the CV.');
  }
  const clipped = text.length > MAX_CV_CHARS ? text.slice(0, MAX_CV_CHARS) : text;
  const template = fs.readFileSync(PROMPT_PATH, 'utf8');
  const userPrompt = template.replace('{{cv_text}}', clipped);
  const systemPrompt = 'You are a CV parsing assistant. Extract data into the requested JSON format. Return ONLY valid JSON.';

  let parsed = null;

  if (getGeminiKey()) {
    try {
      parsed = await geminiJson(systemPrompt, userPrompt);
    } catch (e) {
      console.error('[CV Parse] Gemini failed:', e.message);
      console.log('[CV Parse] Using Groq fallback.');
    }
  }

  if (!parsed && getGroqKey()) {
    try {
      parsed = await groqJson(systemPrompt, userPrompt, GROQ_MODEL_PRIMARY);
    } catch (e) {
      console.error('[CV Parse] Groq (primary) failed:', e.message);
    }
  }

  if (!parsed && getGroqKey()) {
    try {
      console.log('[CV Parse] Trying Groq fallback model…');
      parsed = await groqJson(systemPrompt, userPrompt, GROQ_MODEL_FALLBACK);
    } catch (e) {
      console.error('[CV Parse] Groq (fallback) failed:', e.message);
    }
  }

  if (!parsed) {
    const err = new Error(
      'Resume could not be parsed by AI. Set GROQ_API_KEY (and optionally GEMINI_API_KEY) in the server .env, then try again.',
    );
    err.statusCode = 503;
    throw err;
  }

  return {
    personal: { ...EMPTY_PROFILE.personal, ...parsed.personal },
    professional: {
      ...EMPTY_PROFILE.professional,
      ...parsed.professional,
      workExperience: Array.isArray(parsed.professional?.workExperience) ? parsed.professional.workExperience : [],
      skills: Array.isArray(parsed.professional?.skills) ? parsed.professional.skills : [],
    },
    education: Array.isArray(parsed.education) ? parsed.education : [],
    links: { ...EMPTY_PROFILE.links, ...parsed.links },
  };
}
