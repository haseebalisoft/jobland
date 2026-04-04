import { aiChat } from '../utils/aiHelper.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MOCK_MODEL || 'llama-3.3-70b-versatile';

function getGroqKey() {
  const k = process.env.GROQ_API_KEY;
  if (!k || k === 'your_groq_api_key_here') return null;
  return k;
}

export function buildInterviewerSystemPrompt(scenario, userContext, overrides = {}) {
  const focus = Array.isArray(scenario.focus_areas)
    ? scenario.focus_areas
    : typeof scenario.focus_areas === 'string'
      ? JSON.parse(scenario.focus_areas || '[]')
      : [];
  const merged = { ...userContext, ...overrides };
  const skills = Array.isArray(merged.skills) ? merged.skills.join(', ') : merged.skills || '';
  const jobTitle = scenario.title || 'role';
  const companyType = merged.companyType || 'a technology company';
  const duration = scenario.duration_mins || 25;

  return `You are conducting a ${scenario.category || 'professional'} interview for a ${jobTitle} position at ${companyType}. This is approximately a ${duration}-minute interview.

Focus areas for this session: ${focus.length ? focus.join('; ') : 'General competency and communication'}.

Candidate context (use naturally; do not read this as a script):
- Name: ${merged.name || 'the candidate'}
- Years of experience: ${merged.yearsExp != null ? merged.yearsExp : 'not specified'}
- Current role: ${merged.currentRole || 'not specified'}
- Target role: ${merged.targetRole || 'not specified'}
- Key skills: ${skills || 'not specified'}
- Education: ${merged.education || 'not specified'}
- Professional summary: ${merged.summary || 'not provided'}
${merged.linkedinSummary && merged.linkedinSummary !== merged.summary ? `- LinkedIn / extended summary: ${merged.linkedinSummary}` : ''}

Interview behavior:
- Ask one main question at a time. Listen and ask short, natural follow-ups when helpful.
- Be professional, concise, and conversational—like a real hiring manager or panel interviewer.
- After several exchanges on one theme, transition to the next focus area.
- Near the end of the simulated time, you may wrap up; if the candidate ends early, offer a brief performance summary when they signal they are done.
- Do NOT break character as the interviewer. Do NOT say you are an AI unless the candidate directly asks.
- Do NOT invent employers, degrees, or credentials for the candidate—only reference what is in the context or what they said in this chat.
- Internally note clarity, relevance, depth, and confidence for your own reasoning (do not output scores until a formal debrief is requested).`;
}

/**
 * Non-streaming first turn (session start).
 */
export async function generateOpeningMessage(systemPrompt) {
  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content:
        'Begin the mock interview now. Introduce yourself briefly as the interviewer (use a plausible name/role, no AI mention), then ask your first question.',
    },
  ];
  const text = await aiChat(messages, { temperature: 0.35, max_tokens: 1024 });
  return text.trim();
}

async function* groqStreamMessages(messages, options = {}) {
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
      temperature: options.temperature ?? 0.35,
      max_tokens: options.max_tokens ?? 2048,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Groq stream error: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        /* skip */
      }
    }
  }
}

/**
 * Stream assistant reply given full messages array (system + history + new user).
 */
export async function streamInterviewReply(messages) {
  return groqStreamMessages(messages, { temperature: 0.35, max_tokens: 2048 });
}

const REPORT_SCHEMA_HINT = `Return a JSON object with this shape:
{
  "overallScore": number (0-100),
  "scores": {
    "communication": number (0-10),
    "technicalKnowledge": number (0-10),
    "problemSolving": number (0-10),
    "confidence": number (0-10),
    "relevance": number (0-10)
  },
  "strengths": [ { "title": string, "detail": string, "example": string } ],
  "improvements": [ { "title": string, "detail": string, "suggestion": string } ],
  "betterAnswers": [ { "question": string, "suggestedAnswer": string } ],
  "recommendations": string
}`;

export async function generateInterviewReportJson(transcriptText) {
  const messages = [
    {
      role: 'system',
      content: `You analyze mock job interviews. ${REPORT_SCHEMA_HINT}
Use only the transcript provided. Be constructive and specific.`,
    },
    {
      role: 'user',
      content: `Transcript:\n${transcriptText}\n\nProduce the JSON analysis.`,
    },
  ];
  const raw = await aiChat(messages, {
    temperature: 0.2,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  });
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Report AI returned invalid JSON');
  }
  return parsed;
}
