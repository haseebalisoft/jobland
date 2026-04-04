import api from '../services/api.js';

const ACCESS_TOKEN_STORAGE_KEY = 'hiredlogics_access_token';

export async function streamCoverLetter(body, handlers = {}) {
  const { onChunk, onDone, onError } = handlers;
  const token =
    typeof window !== 'undefined' ? window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
  const base = api.defaults.baseURL || '';
  const url = `${base}/cover-letters/generate`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
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
          /* ignore */
        }
      }
    }
  }
}
