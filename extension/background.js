// Submit job to HiredLogics API (avoids CORS from content script)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'ONECLICK_SUBMIT_JOB') {
    return;
  }
  (async () => {
    const { apiBaseUrl, apiKey, payload } = msg;
    if (!apiBaseUrl || !apiKey || !payload) {
      return { ok: false, error: 'API URL and API Key required. Open extension Options.' };
    }
    const base = apiBaseUrl.replace(/\/$/, '');
    const url = `${base}/api/extension/jobs`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.message || data.error || `HTTP ${res.status}` };
      }
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || 'Network error' };
    }
  })().then(sendResponse);
  return true;
});
