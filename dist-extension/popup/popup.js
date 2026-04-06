const DEFAULT_APP = 'http://localhost:5173';
const DEFAULT_API = 'http://localhost:5000/api';

function $(id) {
  return document.getElementById(id);
}

function setView(authenticated) {
  const out = $('view-out');
  const inn = $('view-in');
  if (!out || !inn) return;
  if (authenticated) {
    out.classList.add('hidden');
    inn.classList.remove('hidden');
  } else {
    out.classList.remove('hidden');
    inn.classList.add('hidden');
  }
}

function loadSettings() {
  chrome.storage.local.get(['hirdlogic_api_base', 'hirdlogic_app_origin'], (d) => {
    const api = $('api-base');
    const app = $('app-origin');
    if (api) api.value = d.hirdlogic_api_base || DEFAULT_API;
    if (app) app.value = d.hirdlogic_app_origin || DEFAULT_APP;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, (auth) => {
    const ok = auth && auth.authenticated;
    setView(ok);
  });
  loadSettings();

  $('btn-signin')?.addEventListener('click', () => {
    chrome.storage.local.get(['hirdlogic_app_origin'], (d) => {
      const origin = d.hirdlogic_app_origin || DEFAULT_APP;
      chrome.tabs.create({ url: `${origin.replace(/\/$/, '')}/login` });
    });
  });

  $('btn-profile')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.linkedin.com/in/me/' });
  });

  $('btn-tracker')?.addEventListener('click', () => {
    chrome.storage.local.get(['hirdlogic_app_origin'], (d) => {
      const origin = d.hirdlogic_app_origin || DEFAULT_APP;
      chrome.tabs.create({ url: `${origin.replace(/\/$/, '')}/dashboard/job-tracker` });
    });
  });

  $('btn-sidebar')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDEBAR' });
    window.close();
  });

  $('btn-save-adv')?.addEventListener('click', () => {
    const api = $('api-base')?.value?.trim();
    const app = $('app-origin')?.value?.trim();
    chrome.storage.local.set(
      {
        hirdlogic_api_base: api || DEFAULT_API,
        hirdlogic_app_origin: app || DEFAULT_APP,
      },
      () => {
        $('btn-save-adv').textContent = 'Saved!';
        setTimeout(() => {
          $('btn-save-adv').textContent = 'Save connection settings';
        }, 1500);
      },
    );
  });
});
