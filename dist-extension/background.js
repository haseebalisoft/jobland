/**
 * Hirdlogic extension — service worker (MV3).
 * Default API base must match api-constants.js (or override in chrome.storage.local.hirdlogic_api_base).
 */

const DEFAULT_API_BASE = 'http://localhost:5000/api';

async function getApiBase() {
  const data = await chrome.storage.local.get(['hirdlogic_api_base']);
  return (data.hirdlogic_api_base && String(data.hirdlogic_api_base).trim()) || DEFAULT_API_BASE;
}

async function checkAuth() {
  const { hirdlogic_token: token } = await chrome.storage.local.get(['hirdlogic_token']);
  if (!token) {
    return { authenticated: false };
  }
  const base = await getApiBase();
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      await chrome.storage.local.remove(['hirdlogic_token', 'hirdlogic_user']);
      return { authenticated: false };
    }
    const user = await res.json();
    await chrome.storage.local.set({ hirdlogic_user: user });
    return { authenticated: true, user };
  } catch {
    return { authenticated: false };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'OPEN_URL' && msg.url) {
    chrome.tabs.create({ url: msg.url });
    sendResponse?.({ ok: true });
    return true;
  }
  if (msg.type === 'OPEN_SIDEBAR') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const id = tabs[0]?.id;
      if (id != null) {
        chrome.tabs.sendMessage(id, { type: 'OPEN_SIDEBAR' }, () => void chrome.runtime.lastError);
      }
    });
    sendResponse?.({ ok: true });
    return true;
  }
  if (msg.type === 'HIRDLOGIC_AUTH_TOKEN') {
    const token = msg.token;
    const user = msg.user || null;
    if (token) {
      chrome.storage.local.set({ hirdlogic_token: token, hirdlogic_user: user }, () => {
        sendResponse({ success: true });
      });
    } else {
      chrome.storage.local.remove(['hirdlogic_token', 'hirdlogic_user'], () => {
        sendResponse({ success: true });
      });
    }
    return true;
  }
  if (msg.type === 'CHECK_AUTH') {
    checkAuth().then(sendResponse);
    return true;
  }
  if (msg.type === 'GET_API_BASE') {
    getApiBase().then((base) => sendResponse({ apiBase: base }));
    return true;
  }
  if (msg.type === 'API_FETCH') {
    (async () => {
      const token = (await chrome.storage.local.get(['hirdlogic_token'])).hirdlogic_token;
      const base = await getApiBase();
      const url = msg.url.startsWith('http') ? msg.url : `${base.replace(/\/$/, '')}${msg.url}`;
      const headers = {
        'Content-Type': 'application/json',
        ...(msg.headers || {}),
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      try {
        const res = await fetch(url, {
          method: msg.method || 'GET',
          headers,
          body: msg.body != null ? JSON.stringify(msg.body) : undefined,
        });
        const text = await res.text();
        let data;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = text;
        }
        sendResponse({ ok: res.ok, status: res.status, data });
      } catch (e) {
        sendResponse({ ok: false, error: e.message || String(e) });
      }
    })();
    return true;
  }
  return undefined;
});
