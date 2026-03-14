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
  if (!res.ok) throw new Error(`Gemini: ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Empty Gemini response');
  return JSON.parse(text);
}

async function groqJson(systemPrompt, userPrompt) {
  const key = getGroqKey();
  if (!key) return null;
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
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

export async function parseCVWithAI(text) {
  if (!text || text.trim().length < 20) {
    throw new Error('Too little text extracted from the CV.');
  }
  const template = fs.readFileSync(PROMPT_PATH, 'utf8');
  const userPrompt = template.replace('{{cv_text}}', text);
  const systemPrompt = 'You are a CV parsing assistant. Extract data into the requested JSON format. Return ONLY valid JSON.';

  let parsed = null;

  if (getGeminiKey()) {
    try {
      parsed = await geminiJson(systemPrompt, userPrompt);
    } catch (e) {
      console.warn('[CV Parse] Gemini failed, trying Groq:', e.message);
    }
  }

  if (!parsed && getGroqKey()) {
    try {
      parsed = await groqJson(systemPrompt, userPrompt);
    } catch (e) {
      console.warn('[CV Parse] Groq failed:', e.message);
    }
  }

  if (!parsed) {
    return { ...EMPTY_PROFILE };
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
