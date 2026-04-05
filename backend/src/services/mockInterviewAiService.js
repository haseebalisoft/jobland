const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MOCK_MODEL || 'llama-3.3-70b-versatile';

function getGroqKey() {
  const k = process.env.GROQ_API_KEY;
  if (!k || k === 'your_groq_api_key_here') return null;
  return k;
}

/**
 * Non-streaming Groq completion. Mock interviews use Groq only (no Gemini) so quota/rate limits
 * on Gemini do not delay or block session start or reports.
 */
async function groqChatComplete(messages, options = {}) {
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
      stream: false,
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

export function buildInterviewerSystemPrompt(scenario, userContext, overrides = {}) {
  const focus = Array.isArray(scenario.focus_areas)
    ? scenario.focus_areas
    : typeof scenario.focus_areas === 'string'
      ? (() => {
          try {
            return JSON.parse(scenario.focus_areas || '[]');
          } catch {
            return [];
          }
        })()
      : [];
  const merged = { ...userContext, ...overrides };
  const focusAreasStr = focus.length ? focus.join(', ') : 'this role';
  const techStackFocus = scenario.tech_stack || scenario.techStack || focusAreasStr;
  const title = scenario.title || 'this role';
  const name = merged.name || 'Candidate';
  const expLine =
    merged.yearsExp != null && merged.yearsExp !== ''
      ? `${merged.yearsExp} years`
      : 'not specified';

  return `You are a strict, concise technical interviewer at a top company.

Role being interviewed: ${title}
Tech stack focus: ${techStackFocus}
Candidate: ${name}
Experience: ${expLine}

STRICT RULES:
- Ask ONE short question at a time (max 2 sentences)
- Questions must be ONLY about: ${focusAreasStr}
- Never ask generic questions unrelated to this stack
- After candidate answers, ask a natural follow-up OR move to next topic
- Keep YOUR messages under 3 sentences max
- Do NOT explain what you are doing
- Do NOT say 'Great answer' or give feedback during interview
- Do NOT list multiple questions
- Be direct, professional, brief

START: Greet in 1 sentence, then immediately ask first technical question specific to ${title}.`;
}

/**
 * Non-streaming first turn (session start).
 */
export async function generateOpeningMessage(systemPrompt) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Begin the interview now. Follow START in the system prompt exactly.' },
  ];
  const text = await groqChatComplete(messages, { temperature: 0.5, max_tokens: 150 });
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
 * Must not be `async` — callers use `for await` on the returned AsyncGenerator; an async
 * wrapper would return Promise<AsyncGenerator> and break iteration.
 */
export function streamInterviewReply(messages) {
  return groqStreamMessages(messages, { temperature: 0.5, max_tokens: 150 });
}

function stripJsonFence(text) {
  let t = String(text || '').trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/s, '');
  }
  return t.trim();
}

/**
 * Strict evaluation from actual transcript only. scenarioTitle + focusAreas + conversation turns.
 */
export async function generateInterviewReportJson({ scenarioTitle, focusAreas, conversation }) {
  const focusList = Array.isArray(focusAreas) ? focusAreas : [];
  const focusStr = focusList.length ? focusList.join(', ') : 'N/A';
  const convLines = (conversation || [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => `${m.role}: ${String(m.content || '').trim()}`);
  const fullConversation = convLines.length ? convLines.join('\n') : '(No messages.)';

  const schema = `{
  "overallScore": number,
  "answeredCorrectly": string[],
  "answeredWrongOrWeak": string[],
  "notCovered": string[],
  "scoreBreakdown": {
    "technicalAccuracy": number,
    "depthOfKnowledge": number,
    "clarity": number,
    "relevance": number
  },
  "strongPoints": string[],
  "weakPoints": string[],
  "correctAnswers": [
    {
      "question": string,
      "theyAnswered": string,
      "correctAnswer": string,
      "wasCorrect": boolean
    }
  ],
  "verdict": string,
  "verdictReason": string
}`;

  const userPrompt = `You are a strict interview evaluator.
Analyze ONLY what the candidate actually said in this interview.
Do NOT give generic feedback. Do NOT be encouraging if answers were weak.
Be brutally honest and accurate.

Interview role: ${scenarioTitle || 'Unknown role'}
Expected topics: ${focusStr}

Full conversation:
${fullConversation}

Evaluate STRICTLY based on actual answers given above.
If the candidate said almost nothing useful, overallScore must be low (e.g. under 30).
If they gave wrong technical answers, list them in answeredWrongOrWeak and correctAnswers with wasCorrect false.
Never assign overallScore 80+ unless answers demonstrate strong substance in the transcript.
Quote the candidate's actual words in strongPoints and weakPoints where possible.
verdict must be exactly one of: "Hire", "Maybe", "No Hire" (match casing).

Return JSON only with this exact shape (all keys required; use empty arrays where nothing applies):
${schema}`;

  const messages = [
    {
      role: 'system',
      content:
        'You return only valid JSON objects. No markdown, no prose outside JSON. All scores are 0-10 for scoreBreakdown subfields; overallScore is 0-100.',
    },
    { role: 'user', content: userPrompt },
  ];

  const raw = await groqChatComplete(messages, {
    temperature: 0.25,
    max_tokens: 8192,
    response_format: { type: 'json_object' },
  });
  let parsed;
  try {
    parsed = JSON.parse(stripJsonFence(raw));
  } catch {
    throw new Error('Report AI returned invalid JSON');
  }
  return parsed;
}
