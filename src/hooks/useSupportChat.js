import { getApiBaseUrl } from '../services/api.js';

const TOKEN_KEY = 'hiredlogics_access_token';

/**
 * POST /api/support-chat/message — streams SSE `data: {...}\n\n` chunks.
 */
export async function streamSupportMessage({ conversationId, message, onToken, onDone, onError }) {
  const base = getApiBaseUrl();
  const token = typeof window !== 'undefined' ? window.sessionStorage.getItem(TOKEN_KEY) : null;
  const url = `${base.replace(/\/+$/, '')}/support-chat/message`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ conversationId, message }),
  });

  if (!res.ok) {
    let msg = 'Could not send message';
    try {
      const j = await res.json();
      msg = j.message || msg;
    } catch {
      /* ignore */
    }
    onError?.(new Error(msg));
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onError?.(new Error('No response body'));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep;
      while ((sep = buffer.indexOf('\n\n')) >= 0) {
        const raw = buffer.slice(0, sep).trim();
        buffer = buffer.slice(sep + 2);
        const lines = raw.split('\n').filter(Boolean);
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          try {
            const data = JSON.parse(payload);
            if (data.t) onToken?.(data.t);
            if (data.done) {
              onDone?.(data);
              return;
            }
          } catch {
            /* ignore */
          }
        }
      }
    }
    onDone?.({});
  } catch (e) {
    onError?.(e);
  }
}
