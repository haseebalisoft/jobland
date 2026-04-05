import api, { getAccessToken, getApiBaseUrl } from '../services/api.js';

export async function streamInterviewMessage(sessionId, message, handlers = {}) {
  const { onChunk, onDone, onError } = handlers;
  const token = typeof window !== 'undefined' ? getAccessToken() : null;
  const base = api.defaults.baseURL || getApiBaseUrl() || '';
  const url = `${base}/mock-interviews/sessions/${sessionId}/message`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const lines = block.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.replace(/^data:\s*/, '').trim();
        if (!payload) continue;
        try {
          const json = JSON.parse(payload);
          if (json.error && onError) onError(json.error);
          if (json.chunk != null && onChunk) onChunk(json.chunk);
          if (json.done === true && onDone) onDone(json);
        } catch {
          /* ignore parse */
        }
      }
    }
  }
}
