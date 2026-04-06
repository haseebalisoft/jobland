/**
 * Runs on the Hirdlogic web app origin. Syncs session token into the extension via storage
 * when the app dispatches `hirdlogic-extension-auth` or when sessionStorage updates (polled).
 */
(function bridge() {
  const TOKEN_KEY = 'hiredlogics_access_token';

  function persistFromSession() {
    try {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) return;
      chrome.storage.local.get(['hirdlogic_token'], (cur) => {
        if (cur.hirdlogic_token === token) return;
        chrome.storage.local.set({ hirdlogic_token: token });
      });
    } catch (_) {
      /* ignore */
    }
  }

  window.addEventListener('hirdlogic-extension-auth', (e) => {
    const d = e.detail || {};
    if (d.token) {
      chrome.storage.local.set({
        hirdlogic_token: d.token,
        hirdlogic_user: d.user != null ? d.user : null,
      });
    } else {
      chrome.storage.local.remove(['hirdlogic_token', 'hirdlogic_user']);
    }
  });

  persistFromSession();
  setInterval(persistFromSession, 4000);
})();
