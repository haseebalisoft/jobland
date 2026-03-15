// ==============================
// HiredLogics OneClick – content script
// Extracts job data and submits to HiredLogics API (jobs + job_assignments).
// ==============================
// Guard: avoid "Identifier already declared" when script is injected multiple times (e.g. manifest + executeScript).
(function () {
  if (typeof window.__hiredlogicsOneClickLoaded !== 'undefined') return;
  window.__hiredlogicsOneClickLoaded = true;

const PREFS_KEY = 'job_capture_prefs_v2';
const API_BASE_URL_KEY = 'hiredlogics_oneclick_api_base_url';
const API_KEY_KEY = 'hiredlogics_oneclick_api_key';
const CLICK_ONLY_MODE = true;

async function loadPrefs() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([PREFS_KEY], (res) => {
      resolve(res?.[PREFS_KEY] || {});
    });
  });
}

async function savePrefs(next) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [PREFS_KEY]: next }, () => resolve());
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Company = employer who posted the job, NOT the job board. Filter out platform names.
const JOB_BOARD_NAMES = [
  'indeed', 'linkedin', 'glassdoor', 'greenhouse', 'lever', 'wellfound', 'angel list', 'angel.co',
  'remoteok', 'ziprecruiter', 'dice', 'monster', 'careerbuilder', 'flexjobs', 'simplyhired', 'rocketship'
];
function isJobBoardName(str) {
  if (!str || typeof str !== 'string') return true;
  const s = str.trim().toLowerCase();
  if (s.length < 2) return true;
  return JOB_BOARD_NAMES.some(name => s === name || s.includes(name) || name.includes(s));
}

function cleanCompany(company) {
  return company && !isJobBoardName(company) ? company.trim() : '';
}

// ==============================
// Job data extraction – title, employer company (not job board), location
// ==============================
function extractJobData() {
  const url = location.href;
  let title = '';
  let company = '';
  let locationText = '';
  let description = '';

  if (/linkedin\.com\/jobs\//i.test(url)) {
    title =
      document.querySelector('.job-details-jobs-unified-top-card__job-title')?.textContent?.trim() ||
      document.querySelector('h1')?.innerText?.trim() ||
      document.querySelector('.top-card-layout__title')?.textContent?.trim() ||
      document.querySelector('.jobs-unified-top-card__job-title')?.textContent?.trim() ||
      document.querySelector('[class*="job-title"]')?.textContent?.trim() || '';
    const linkedInCompanyCandidates = [
      document.querySelector('.job-details-jobs-unified-top-card__company-name')?.textContent?.trim(),
      document.querySelector('.topcard__flavor a')?.textContent?.trim(),
      document.querySelector('.topcard__org-name-link')?.textContent?.trim(),
      document.querySelector('.topcard__org-name')?.textContent?.trim(),
      document.querySelector('.jobs-unified-top-card__company-name a')?.textContent?.trim(),
      document.querySelector('.jobs-unified-top-card__company-name')?.textContent?.trim(),
      document.querySelector('[class*="company-name"]')?.textContent?.trim()
    ].filter(Boolean);
    for (const c of linkedInCompanyCandidates) {
      const cleaned = cleanCompany(c);
      if (cleaned) { company = cleaned; break; }
    }
    locationText =
      document.querySelector('.job-details-jobs-unified-top-card__bullet')?.textContent?.trim() ||
      document.querySelector('.jobs-unified-top-card__primary-description-without-tagline')?.textContent?.trim() ||
      document.querySelector('.jobs-unified-top-card__primary-description-container')?.textContent?.trim() || '';
  }

  if (!title && /indeed\.com/i.test(url)) {
    title =
      document.querySelector('.jobsearch-JobInfoHeader-title')?.textContent?.trim() ||
      document.querySelector('h1')?.innerText?.trim() ||
      document.querySelector("[data-testid='job-title']")?.textContent?.trim() ||
      document.querySelector('[class*="JobInfoHeader-title"]')?.textContent?.trim() || '';
    const indeedCompanyCandidates = [
      document.querySelector('[data-company-name]')?.textContent?.trim(),
      document.querySelector('[data-company-name] a')?.textContent?.trim(),
      document.querySelector('a[data-tn-element="companyName"]')?.textContent?.trim(),
      document.querySelector('[class*="companyName"]')?.textContent?.trim(),
      document.querySelector('.jobsearch-InlineCompanyRating div:first-child')?.textContent?.trim(),
      document.querySelector('.jobsearch-CompanyReview--heading')?.textContent?.trim()
    ].filter(Boolean);
    for (const c of indeedCompanyCandidates) {
      const cleaned = cleanCompany(c);
      if (cleaned) { company = cleaned; break; }
    }
    locationText =
      document.querySelector('[data-testid="job-location"]')?.textContent?.trim() ||
      document.querySelector('.jobsearch-CompanyReview--heading')?.nextElementSibling?.textContent?.trim() ||
      document.querySelector('[class*="jobLocation"]')?.textContent?.trim() || '';
  }

  if (!title && /glassdoor\.com\//i.test(url)) {
    title =
      document.querySelector('h1')?.innerText?.trim() ||
      document.querySelector('[data-test="job-title"]')?.textContent?.trim() ||
      document.querySelector('.jobTitle')?.textContent?.trim() || '';
    company = cleanCompany(
      document.querySelector('[data-test="employerName"]')?.textContent?.trim() ||
      document.querySelector('.employerName')?.textContent?.trim() || ''
    ) || company;
  }

  if (!title && /greenhouse\.io\//i.test(url)) {
    title = document.querySelector('h1')?.innerText?.trim() || document.querySelector('.app-title')?.textContent?.trim() || '';
    company = cleanCompany(document.querySelector('.company-name')?.textContent?.trim() || document.querySelector('.company')?.textContent?.trim() || '') || company;
  }

  if (!title && /jobs\.lever\.co\//i.test(url)) {
    title = document.querySelector('h2')?.innerText?.trim() || document.querySelector('.posting-headline h2')?.textContent?.trim() || '';
    company = cleanCompany(document.querySelector('.posting-categories .company')?.textContent?.trim() || document.querySelector('.company')?.textContent?.trim() || '') || company;
  }

  if (!title && /wellfound\.com\//i.test(url)) {
    title = document.querySelector('h1')?.innerText?.trim() || document.querySelector('.job-title')?.textContent?.trim() || '';
    company = cleanCompany(document.querySelector('.company-name')?.textContent?.trim() || document.querySelector('.startup-name')?.textContent?.trim() || '') || company;
  }

  if (!title && /remoteok\.com\//i.test(url)) {
    title = document.querySelector('h1')?.innerText?.trim() || document.querySelector('h2[itemprop="title"]')?.textContent?.trim() || '';
    company = cleanCompany(document.querySelector("[itemprop='name']")?.textContent?.trim() || document.querySelector('.companyLink')?.textContent?.trim() || '') || company;
  }

  if (!title && /ziprecruiter\.com\//i.test(url)) {
    title = document.querySelector('h1')?.innerText?.trim() || document.querySelector('.job_title')?.textContent?.trim() || '';
    company = cleanCompany(document.querySelector('.company_name')?.textContent?.trim() || document.querySelector('.company')?.textContent?.trim() || '') || company;
  }

  const titleSelectors = [
    'h1', 'h2',
    '[data-test="job-title"]', '[data-testid="job-title"]', '.job-title', '.jobTitle',
    '.posting-title', '.posting-headline h2', '.app-title', '.jobsearch-JobInfoHeader-title'
  ];
  if (!title) {
    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        title = el.textContent.trim();
        break;
      }
    }
  }

  const companySelectors = [
    '[data-test="employerName"]', '[data-company-name]', '.company-name', '.company',
    '.topcard__org-name', '.jobs-unified-top-card__company-name', '.jobsearch-InlineCompanyRating div:first-child',
    '.posting-categories .company', '[itemprop="name"]'
  ];
  if (!company) {
    for (const selector of companySelectors) {
      const el = document.querySelector(selector);
      const raw = el?.textContent?.trim();
      if (raw && !isJobBoardName(raw)) {
        company = raw;
        break;
      }
    }
  }

  if (!company && document.title) {
    const parts = document.title.split(/[-|·–—]/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2 && !isJobBoardName(parts[1])) {
      company = parts[1];
    }
  }

  const locationSelectors = [
    '[data-testid="job-location"]', '[data-test="job-location"]', '.job-location', '.location',
    '.jobsearch-InlineCompanyRating .jobsearch-CompanyReview--heading + div',
    '.topcard__flavor', '.jobs-unified-top-card__primary-description-without-tagline'
  ];
  if (!locationText) {
    for (const sel of locationSelectors) {
      const el = document.querySelector(sel);
      const t = el?.textContent?.trim();
      if (t && t.length < 200) {
        locationText = t;
        break;
      }
    }
  }

  return { title, company, url, location: locationText, description };
}

const PLATFORM_OPTIONS = [
  'indeed.com', 'linkedin.com', 'glassdoor.com', 'greenhouse.io', 'boards.greenhouse.io',
  'lever.co', 'jobs.lever.co', 'wellfound.com', 'angel.co', 'remoteok.com',
  'ziprecruiter.com', 'dice.com', 'monster.com', 'careerbuilder.com',
  'flexjobs.com', 'simplyhired.com', 'rocketship.com'
];

function detectPlatform() {
  const u = location.href.toLowerCase();
  if (u.includes('boards.greenhouse.io')) return 'boards.greenhouse.io';
  if (u.includes('jobs.lever.co')) return 'jobs.lever.co';
  if (u.includes('indeed.com')) return 'indeed.com';
  if (u.includes('linkedin.com')) return 'linkedin.com';
  if (u.includes('glassdoor.com')) return 'glassdoor.com';
  if (u.includes('greenhouse.io')) return 'greenhouse.io';
  if (u.includes('lever.co')) return 'lever.co';
  if (u.includes('wellfound.com')) return 'wellfound.com';
  if (u.includes('angel.co')) return 'angel.co';
  if (u.includes('remoteok.com')) return 'remoteok.com';
  if (u.includes('ziprecruiter.com')) return 'ziprecruiter.com';
  if (u.includes('dice.com')) return 'dice.com';
  if (u.includes('monster.com')) return 'monster.com';
  if (u.includes('careerbuilder.com')) return 'careerbuilder.com';
  if (u.includes('flexjobs.com')) return 'flexjobs.com';
  if (u.includes('simplyhired.com')) return 'simplyhired.com';
  if (u.includes('rocketship.com')) return 'rocketship.com';
  return null;
}

// ==============================
// In-page popup
// ==============================
async function createPopup(initial) {
  if (document.getElementById('job-capture-popup')) return;

  const prefs = await loadPrefs();
  const detectedPlatform = detectPlatform();

  const initialLocation = initial.location || '';
  const initialDesc = initial.description || '';

  const platformSelectOptions = PLATFORM_OPTIONS.map(p => {
    const selected = detectedPlatform === p ? ' selected' : '';
    return `<option value="${escapeHtml(p)}"${selected}>${escapeHtml(p)}</option>`;
  }).join('');

  const container = document.createElement('div');
  container.id = 'job-capture-popup';
  container.style.cssText = `
    position: fixed; top: 12px; right: 12px; z-index: 2147483647; width: 280px;
    background: #fff; border-radius: 12px; box-shadow: 0 10px 24px rgba(0,0,0,0.12);
    padding: 14px; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #0f172a;
  `;

  const reqStar = '<span style="color:#b91c1c;">*</span>';
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div style="font-weight:700;font-size:14px;color:#0f172a;">HiredLogics OneClick</div>
      <button id="jc-close" title="Close" style="appearance:none;border:none;background:#f1f5f9;color:#64748b;width:24px;height:24px;border-radius:6px;cursor:pointer;font-size:16px;">×</button>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
      <label style="font-size:12px;color:#475569;">Job Title ${reqStar}</label>
      <button type="button" id="jc-refetch" title="Refetch title & company from page" style="font-size:11px;color:#2563eb;background:none;border:none;cursor:pointer;padding:0;text-decoration:underline;">Refetch</button>
    </div>
    <input id="jc-title" type="text" value="${escapeHtml(initial.title)}" style="width:100%;margin-bottom:8px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;" />
    <label style="font-size:12px;color:#475569;">Company (employer) ${reqStar}</label>
    <input id="jc-company" type="text" value="${escapeHtml(initial.company)}" placeholder="Company posting the job" style="width:100%;margin-bottom:8px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;" />
    <label style="font-size:12px;color:#475569;">Job URL ${reqStar}</label>
    <input id="jc-url" type="text" value="${escapeHtml(initial.url)}" style="width:100%;margin-bottom:8px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;font-size:11px;" />
    <label style="font-size:12px;color:#475569;">Location ${reqStar}</label>
    <input id="jc-location" type="text" value="${escapeHtml(initialLocation)}" placeholder="e.g. Remote, New York, NY" style="width:100%;margin-bottom:8px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;" />
    <label style="font-size:12px;color:#475569;">Work type ${reqStar}</label>
    <select id="jc-work-type" style="width:100%;margin-bottom:8px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;">
      <option value="">Select…</option>
      <option value="remote">Remote</option>
      <option value="hybrid">Hybrid</option>
      <option value="onsite">Onsite</option>
    </select>
    <label style="font-size:12px;color:#475569;">Description (optional)</label>
    <textarea id="jc-description" rows="3" placeholder="Paste or type job description…" style="width:100%;margin-bottom:8px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;resize:vertical;min-height:60px;font-family:inherit;">${escapeHtml(initialDesc)}</textarea>
    <label style="font-size:12px;color:#475569;">Platform</label>
    <select id="jc-platform" style="width:100%;margin-bottom:10px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;">
      <option value="">Select (optional)</option>
      ${platformSelectOptions}
    </select>
    <button id="jc-submit" style="width:100%;background:#10b981;color:#fff;border:none;border-radius:8px;padding:10px;cursor:pointer;font-weight:700;font-size:13px;">Save to HiredLogics</button>
    <div id="jc-status" style="margin-top:8px;font-size:12px;display:none;text-align:center;"></div>
  `;

  document.body.appendChild(container);

  const submitBtn = container.querySelector('#jc-submit');
  const statusEl = container.querySelector('#jc-status');

  container.querySelector('#jc-close').addEventListener('click', () => {
    container.remove();
    renderMiniToggle();
  });

  container.querySelector('#jc-refetch').addEventListener('click', () => {
    const data = extractJobData();
    container.querySelector('#jc-title').value = data.title || '';
    container.querySelector('#jc-company').value = data.company || '';
    container.querySelector('#jc-location').value = data.location || '';
    if (data.title || data.company || data.location) {
      statusEl.textContent = 'Fetched from page.';
      statusEl.style.display = 'block';
      statusEl.style.color = '#065f46';
      setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
    }
  });

  submitBtn.addEventListener('click', async () => {
    const title = container.querySelector('#jc-title').value.trim();
    const company = container.querySelector('#jc-company').value.trim();
    const jobUrl = container.querySelector('#jc-url').value.trim();
    const location = container.querySelector('#jc-location').value.trim();
    const workType = container.querySelector('#jc-work-type').value.trim().toLowerCase();
    const description = container.querySelector('#jc-description').value.trim();
    const platform = container.querySelector('#jc-platform').value.trim() || detectPlatform();

    if (!title || !company || !jobUrl || !location || !workType) {
      statusEl.style.display = 'block';
      statusEl.style.color = '#b91c1c';
      statusEl.textContent = 'Please fill all required fields: Title, Company, Job URL, Location, Work type.';
      return;
    }
    if (!['remote', 'hybrid', 'onsite'].includes(workType)) {
      statusEl.style.display = 'block';
      statusEl.style.color = '#b91c1c';
      statusEl.textContent = 'Work type must be Remote, Hybrid, or Onsite.';
      return;
    }

    const st = await chrome.storage.sync.get([API_BASE_URL_KEY, API_KEY_KEY]);
    const apiBaseUrl = st[API_BASE_URL_KEY];
    const apiKey = st[API_KEY_KEY];

    if (!apiBaseUrl || !apiKey) {
      statusEl.style.display = 'block';
      statusEl.style.color = '#b91c1c';
      statusEl.textContent = 'Set API URL and API Key in extension Options (right‑click icon → Options).';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';
    statusEl.style.display = 'none';

    const payload = { title, company_name: company, job_url: jobUrl, location, work_type: workType };
    if (platform) payload.platform = platform;
    if (description) payload.description = description;

    chrome.runtime.sendMessage(
      { type: 'ONECLICK_SUBMIT_JOB', apiBaseUrl, apiKey, payload },
      (response) => {
        if (chrome.runtime.lastError) {
          statusEl.style.display = 'block';
          statusEl.style.color = '#b91c1c';
          statusEl.textContent = 'Error: ' + (chrome.runtime.lastError.message || 'Unknown');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save to HiredLogics';
          return;
        }
        if (response?.ok) {
          statusEl.style.display = 'block';
          statusEl.style.color = '#065f46';
          statusEl.textContent = 'Saved. Check Your leads in the BD dashboard.';
          submitBtn.textContent = 'Saved';
          submitBtn.style.background = '#0d9668';
          setTimeout(() => container.remove(), 2000);
        } else {
          statusEl.style.display = 'block';
          statusEl.style.color = '#b91c1c';
          statusEl.textContent = response?.error || 'Failed to save';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save to HiredLogics';
        }
      }
    );
  });
}

function renderMiniToggle() {
  if (document.getElementById('job-capture-mini-toggle')) return;
  const btn = document.createElement('button');
  btn.id = 'job-capture-mini-toggle';
  btn.title = 'Open HiredLogics OneClick';
  btn.style.cssText = `
    position: fixed; bottom: 14px; right: 14px; z-index: 2147483647;
    width: 54px; height: 54px; border-radius: 999px; border: 0;
    background: #10b981; color: #fff; cursor: pointer;
    box-shadow: 0 10px 24px rgba(16,185,129,0.25); font-weight: 800; font-size: 18px;
  `;
  btn.textContent = '▶';
  btn.addEventListener('click', () => {
    btn.remove();
    const data = extractJobData();
    createPopup(data);
  });
  document.body.appendChild(btn);
}

async function maybeShowPopup() {
  const data = extractJobData();
  if (!data.title && !data.company) return;
  createPopup(data);
}

let initialized = false;
function initOnce() {
  if (initialized) return;
  initialized = true;
  Promise.all([loadPrefs()]).then(([p]) => {
    if (CLICK_ONLY_MODE) return;
    if (p.enabled !== false) maybeShowPopup();
  });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initOnce();
} else {
  window.addEventListener('DOMContentLoaded', initOnce, { once: true });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'CLICKY_OPEN_POPUP') {
    const data = extractJobData();
    createPopup(data);
  }
});
})();
