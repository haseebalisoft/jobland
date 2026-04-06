/* global HIRDLOGIC_DEFAULT_API_BASE */
(function () {
  const DEFAULT_APP =
    (typeof HIRDLOGIC_DEFAULT_APP_ORIGIN !== 'undefined' && HIRDLOGIC_DEFAULT_APP_ORIGIN) ||
    'http://localhost:5173';

  let state = {
    open: false,
    auth: null,
    mode: 'general',
    page: 'list',
    filter: 'all',
    sections: [],
    overallScore: 0,
    selectedIndex: 0,
    analysis: null,
    aiOptions: null,
    jobDraft: null,
    loading: false,
    toast: '',
    resumes: [],
    matchResult: null,
  };

  function apiFetch(path, method, body) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'API_FETCH', url: path, method: method || 'GET', body: body ?? undefined },
        (res) => resolve(res),
      );
    });
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function scrapeLinkedInProfile() {
    const openToWorkEl = document.querySelector('[data-view-name="open-to-work"]');
    const otwBadge = document.querySelector('.distinction-card');
    let openToWork = null;
    if (openToWorkEl || (otwBadge && /open to/i.test(otwBadge.textContent || ''))) openToWork = true;

    const expLis = Array.from(document.querySelectorAll('#experience ~ div li, #experience + * li')).slice(0, 20);
    const experience = expLis.map((el) => ({
      title: el.querySelector('.hoverable-link-text span[aria-hidden]')?.textContent?.trim(),
      company: el.querySelector('.t-14.t-normal span')?.textContent?.trim(),
    }));

    const eduLis = Array.from(document.querySelectorAll('#education ~ div li, #education + * li')).slice(0, 10);
    const education = eduLis.map((el) => ({
      school: el.querySelector('.hoverable-link-text')?.textContent?.trim(),
    }));

    const skillSpans = Array.from(
      document.querySelectorAll('#skills ~ div li .hoverable-link-text, #skills + * li span'),
    ).slice(0, 40);
    const skills = [...new Set(skillSpans.map((el) => el.textContent?.trim()).filter(Boolean))];

    return {
      name: document.querySelector('.text-heading-xlarge')?.textContent?.trim(),
      headline: document.querySelector('.text-body-medium.break-words')?.textContent?.trim(),
      location: document.querySelector('.text-body-small.inline')?.textContent?.trim(),
      about: document.querySelector('#about ~ div .display-flex .full-width span[aria-hidden]')
        ?.textContent?.trim() ||
        document.querySelector('#about ~ div .inline-show-more-text')?.textContent?.trim(),
      experience,
      education,
      skills,
      profilePhoto: document.querySelector('.pv-top-card-profile-picture__image')?.src,
      banner: document.querySelector('.profile-background-image__image')?.src,
      connectionsCount: document.querySelector('.t-bold span')?.textContent?.trim(),
      recommendationsCount: document.querySelectorAll('#recommendations ~ div li').length || 0,
      featuredCount: document.querySelectorAll('#featured ~ div li').length || 0,
      openToWork,
      profileUrl: window.location.href,
    };
  }

  function scrapeLinkedInJob() {
    const title =
      document.querySelector('.jobs-unified-top-card__job-title')?.textContent?.trim() ||
      document.querySelector('h1')?.textContent?.trim();
    const company =
      document.querySelector('.jobs-unified-top-card__company-name a')?.textContent?.trim() ||
      document.querySelector('.jobs-unified-top-card__company-name')?.textContent?.trim();
    const location =
      document.querySelector('.jobs-unified-top-card__bullet')?.textContent?.trim() ||
      document.querySelector('.jobs-unified-top-card__primary-description-container')?.textContent?.trim();
    const desc =
      document.querySelector('.jobs-description-content__text')?.textContent?.trim() ||
      document.querySelector('.jobs-box__html-content')?.textContent?.trim() ||
      '';
    const salary = document.querySelector('.jobs-unified-top-card__job-insight--highlight')?.textContent?.trim();
    return {
      title,
      company,
      location,
      salary,
      description: desc,
      url: window.location.href,
      platform: 'linkedin',
    };
  }

  function scrapeIndeedJob() {
    const title = document.querySelector('h1')?.textContent?.trim();
    const company =
      document.querySelector('[data-company-name]')?.textContent?.trim() ||
      document.querySelector('.jobsearch-InlineCompanyRating a')?.textContent?.trim();
    const location = document.querySelector('[data-testid="job-location"]')?.textContent?.trim();
    const desc =
      document.querySelector('#jobDescriptionText')?.textContent?.trim() ||
      document.querySelector('.jobsearch-jobDescriptionText')?.textContent?.trim() ||
      '';
    return {
      title,
      company,
      location,
      salary: '',
      description: desc,
      url: window.location.href,
      platform: 'indeed',
    };
  }

  function scrapeLeverJob() {
    const title = document.querySelector('.posting-headline')?.textContent?.trim() || document.querySelector('h2')?.textContent?.trim();
    const company = document.querySelector('.company-name')?.textContent?.trim() || '';
    const desc = document.querySelector('.section-wrapper')?.textContent?.trim() || document.body.innerText.slice(0, 8000);
    return {
      title,
      company,
      location: '',
      salary: '',
      description: desc,
      url: window.location.href,
      platform: 'lever',
    };
  }

  function scrapeGreenhouseJob() {
    const title = document.querySelector('#app_title')?.textContent?.trim() || document.querySelector('h1')?.textContent?.trim();
    const company = document.querySelector('.company-name')?.textContent?.trim() || '';
    const desc = document.querySelector('#content')?.textContent?.trim() || '';
    return {
      title,
      company,
      location: '',
      salary: '',
      description: desc,
      url: window.location.href,
      platform: 'greenhouse',
    };
  }

  function detectMode() {
    const h = location.hostname;
    const p = location.pathname;
    if (h.includes('linkedin.com') && /\/in\//i.test(p)) return 'profile';
    if (h.includes('linkedin.com') && /\/jobs/i.test(p)) return 'job';
    if (h.includes('indeed.com')) return 'job';
    if (h.includes('lever.co')) return 'job';
    if (h.includes('greenhouse.io')) return 'job';
    if (h.includes('linkedin.com')) return 'general';
    return 'general';
  }

  function scrapeJobForMode() {
    const h = location.hostname;
    if (h.includes('linkedin.com')) return scrapeLinkedInJob();
    if (h.includes('indeed.com')) return scrapeIndeedJob();
    if (h.includes('lever.co')) return scrapeLeverJob();
    if (h.includes('greenhouse.io')) return scrapeGreenhouseJob();
    return {
      title: document.title,
      company: '',
      location: '',
      salary: '',
      description: document.body.innerText.slice(0, 8000),
      url: window.location.href,
      platform: h,
    };
  }

  const SECTION_DESC = {
    profile_photo: 'A professional photo increases profile views and trust.',
    banner: 'A banner reinforces your personal brand.',
    headline: 'Headline is a short one-liner that appears under your name.',
    open_to_work: 'Let recruiters know you are open to opportunities.',
    location: 'Location helps with local and remote discovery.',
    connections: 'A healthy network improves reach and credibility.',
    about: 'The About section tells your story and includes keywords.',
    experience: 'Roles should show impact with metrics where possible.',
    education: 'Education adds credibility for early-career roles.',
    skills: 'Skills are used in recruiter searches — cover your stack.',
    recommendations: 'Social proof from colleagues strengthens your profile.',
    featured: 'Featured items showcase work, posts, or links.',
  };

  const SCROLL_MAP = {
    profile_photo: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    banner: () =>
      document.querySelector('.profile-background-image')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    headline: () =>
      document.querySelector('.pv-top-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    open_to_work: () =>
      document.querySelector('[data-view-name="open-to-work"]')?.scrollIntoView({ behavior: 'smooth' }) ||
      window.scrollTo({ top: 200, behavior: 'smooth' }),
    location: () =>
      document.querySelector('.pv-top-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    connections: () =>
      document.querySelector('.pv-top-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    about: () => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    experience: () => document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    education: () => document.getElementById('education')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    skills: () => document.getElementById('skills')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    recommendations: () =>
      document.getElementById('recommendations')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    featured: () => document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  };

  function goToSection(key) {
    const fn = SCROLL_MAP[key];
    if (fn) fn();
  }

  function applyTextToLinkedIn(sectionKey, text) {
    if (sectionKey === 'headline') {
      const btn =
        document.querySelector('button[aria-label*="Edit intro"]') ||
        document.querySelector('[data-view-name="profile-top-card-edit"]');
      btn?.click();
      setTimeout(() => {
        const ta =
          document.querySelector('textarea[name="headline"]') ||
          document.querySelector('input[name="headline"]') ||
          document.querySelector('#single-line-text-form-component-formElement-urn-li-fsu-profileContactInfoEditFormElement-TOP-CARD-SUBTITLE-ACo');
        if (ta) {
          ta.focus();
          ta.value = text;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 600);
      return;
    }
    if (sectionKey === 'about') {
      const about = document.getElementById('about');
      about?.querySelector('a[href*="edit"]')?.click() ||
        document.querySelector('[aria-label*="About"]')?.closest('button')?.click();
      setTimeout(() => {
        const ed =
          document.querySelector('textarea[name="summary"]') ||
          document.querySelector('.ql-editor') ||
          document.querySelector('[contenteditable="true"]');
        if (ed) {
          ed.focus();
          if (ed.tagName === 'TEXTAREA') {
            ed.value = text;
            ed.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            ed.textContent = text;
          }
        }
      }, 900);
      return;
    }
    navigator.clipboard.writeText(text).catch(() => {});
    state.toast = 'Copied to clipboard — paste into the field.';
    renderBody();
  }

  function badgeForStatus(st) {
    if (st === 'complete') return '<span class="hl-badge ok" title="Complete">✓</span>';
    if (st === 'improve') return '<span class="hl-badge mid" title="Can improve">⚡</span>';
    return '<span class="hl-badge bad" title="Missing or critical">!</span>';
  }

  function ringColor(score) {
    if (score >= 70) return '#22c55e';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  }

  function filteredSections() {
    const f = state.filter;
    const list = state.sections || [];
    if (f === 'all') return list;
    if (f === 'complete') return list.filter((s) => s.status === 'complete');
    if (f === 'improve') return list.filter((s) => s.status === 'improve');
    if (f === 'critical') return list.filter((s) => s.status === 'critical');
    return list;
  }

  function renderRing(score) {
    const c = ringColor(score);
    const r = 28;
    const circ = 2 * Math.PI * r;
    const offset = circ - (circ * score) / 100;
    return `
      <div class="hl-ring-wrap">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="${r}" fill="none" stroke="#334155" stroke-width="6" />
          <circle cx="36" cy="36" r="${r}" fill="none" stroke="${c}" stroke-width="6"
            stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round" />
        </svg>
        <div class="hl-ring-num">${esc(score)}%</div>
      </div>`;
  }

  async function loadAnalysis() {
    state.loading = true;
    renderBody();
    const scraped = scrapeLinkedInProfile();
    const res = await apiFetch('/linkedin/analyze', 'POST', { scrapedProfile: scraped });
    state.loading = false;
    if (res.ok && res.data) {
      state.analysis = res.data;
      state.overallScore = res.data.overallScore || 0;
      state.sections = res.data.sections || [];
    } else {
      state.toast = (res.data && res.data.message) || res.error || 'Could not analyze profile.';
    }
    renderBody();
  }

  async function syncProfile() {
    state.loading = true;
    renderBody();
    const scraped = scrapeLinkedInProfile();
    const res = await apiFetch('/linkedin/sync-profile', 'POST', { scrapedProfile: scraped });
    state.loading = false;
    if (res.ok) state.toast = 'Profile synced to Hirdlogic.';
    else state.toast = (res.data && res.data.message) || 'Sync failed.';
    renderBody();
  }

  async function runAiGenerate(sectionKey) {
    state.loading = true;
    renderBody();
    const scraped = scrapeLinkedInProfile();
    const cur =
      sectionKey === 'headline'
        ? scraped.headline
        : sectionKey === 'about'
          ? scraped.about
          : '';
    const res = await apiFetch('/linkedin/generate', 'POST', {
      section: sectionKey,
      currentContent: cur,
      linkedinProfile: scraped,
    });
    state.loading = false;
    if (res.ok && res.data && res.data.options) {
      state.aiOptions = res.data.options;
    } else {
      state.toast = (res.data && res.data.message) || res.error || 'AI generate failed.';
      state.aiOptions = null;
    }
    renderBody();
  }

  async function loadResumes() {
    const res = await apiFetch('/cv/saved', 'GET');
    if (res.ok && res.data) {
      state.resumes = Array.isArray(res.data) ? res.data : res.data.items || [];
    }
  }

  async function saveJobStatus(status) {
    const j = state.jobDraft || scrapeJobForMode();
    state.loading = true;
    renderBody();
    const payload = {
      title: j.title || 'Untitled role',
      company: j.company || 'Company',
      job_url: j.url || window.location.href,
      notes: j.notes || null,
    };
    const res = await apiFetch('/user/jobs', 'POST', payload);
    if (!res.ok) {
      state.loading = false;
      state.toast = (res.data && res.data.message) || 'Could not save job.';
      renderBody();
      return;
    }
    const created = res.data;
    if (status === 'applied' && created.id) {
      await apiFetch(`/user/jobs/${created.id}`, 'PATCH', { status: 'applied' });
    }
    state.loading = false;
    state.toast = 'Saved — open Job Tracker in Hirdlogic to manage it.';
    renderBody();
  }

  async function runJobMatch(jd) {
    state.loading = true;
    state.matchResult = null;
    renderBody();
    const res = await apiFetch('/cv/job-match', 'POST', { jd });
    state.loading = false;
    if (res.ok && res.data) state.matchResult = res.data.gapAnalysis || res.data;
    else state.toast = (res.data && res.data.error) || 'Match failed — upload a resume in Hirdlogic first.';
    renderBody();
  }

  function renderDetail() {
    const list = filteredSections();
    const sec = list[state.selectedIndex];
    if (!sec) {
      state.page = 'list';
      return renderBody();
    }
    const idxLabel = `${state.selectedIndex + 1}/${list.length}`;
    const desc = SECTION_DESC[sec.key] || '';
    const tips = (sec.tips || []).map((t) => `<li>${esc(t)}</li>`).join('');
    const checklist = (sec.tips || []).map((t, i) => ({
      done: sec.status === 'complete',
      text: t,
    }));

    const aiBlock =
      state.aiOptions && state.aiOptions.length
        ? `<div class="hl-options">
            ${state.aiOptions
              .map(
                (o, i) => `
              <div class="hl-opt-card">
                <p>${esc(o.content)}</p>
                ${o.explanation ? `<p class="hl-muted">${esc(o.explanation)}</p>` : ''}
                <div class="hl-opt-actions">
                  <button type="button" data-copy-ai="${i}">Copy</button>
                  <button type="button" class="hl-apply" data-apply-ai="${i}">Apply</button>
                </div>
              </div>`,
              )
              .join('')}
           </div>`
        : '';

    return `
      <div class="hl-detail-head">
        <a href="#" data-back="1">‹ Back to 'All' list</a>
        <div style="display:flex;justify-content:flex-end;font-size:13px;margin-top:4px;">${esc(idxLabel)}</div>
        <div class="hl-detail-nav">
          <button type="button" data-nav="prev" aria-label="Previous">‹</button>
          <div style="flex:1;text-align:center;font-weight:700;">${badgeForStatus(sec.status)} ${esc(sec.name)}</div>
          <button type="button" data-nav="next" aria-label="Next">›</button>
        </div>
        <div class="hl-detail-desc">${esc(desc)}</div>
      </div>
      <div class="hl-ai-card">
        <span class="hl-premium">★ Premium</span>
        <h3>Generate using AI</h3>
        <p>Supercharge your ${esc(sec.name)} with AI</p>
        <button type="button" class="hl-btn-blue" data-gen-ai="1">Start Now ›</button>
      </div>
      <div class="hl-rec-card">
        <h4>💡 Recommendations</h4>
        <ul>${tips || '<li>Keep this section aligned with your target role.</li>'}</ul>
      </div>
      <div class="hl-checklist">
        <h4>Checklist</h4>
        ${checklist
          .map(
            (c) => `
          <div class="hl-check-item">
            <span>${c.done ? '✓' : '››'}</span>
            <span>${esc(c.text)}</span>
          </div>`,
          )
          .join('')}
      </div>
      ${aiBlock}
      <div class="hl-footer-btns">
        <button type="button" class="hl-btn-ghost" data-go-section="${esc(sec.key)}">Go to Section</button>
        <button type="button" class="hl-btn-blue" data-edit-section="${esc(sec.key)}">Edit Now</button>
      </div>`;
  }

  function renderProfileViews(shadow) {
    const body = shadow.querySelector('.hl-body');
    if (!body) return;

    if (state.loading) {
      body.innerHTML = '<div class="hl-loading">Loading…</div>';
      return;
    }

    if (state.page === 'detail') {
      body.innerHTML = renderDetail();
      bindDetail(shadow);
      return;
    }

    const rows = filteredSections()
      .map((s, i) => {
        const chip = s.key === 'headline' ? '<span class="hl-chip">New AI Feature</span>' : '';
        return `<button type="button" class="hl-row" data-sec-idx="${i}">
          ${badgeForStatus(s.status)}
          <span class="hl-row-title">${esc(s.name)}</span>
          ${chip}
          <span class="hl-chevron">›</span>
        </button>`;
      })
      .join('');

    body.innerHTML = `
      <div class="hl-hero">
        <h2>Let's Optimize</h2>
        <p>Set your LinkedIn profile up for your dream job.</p>
        <div class="hl-hero-row">
          ${renderRing(state.overallScore)}
          <div class="hl-hero-actions">
            <button type="button" class="hl-btn-blue" data-start-opt="1">Start Optimization</button>
            <button type="button" class="hl-btn-white-outline" data-sync="1">↺ Sync Profile</button>
          </div>
        </div>
      </div>
      <div class="hl-tabs">
        <button type="button" class="hl-tab ${state.filter === 'all' ? 'hl-active' : ''}" data-filter="all" title="All">🌐</button>
        <button type="button" class="hl-tab ${state.filter === 'complete' ? 'hl-active' : ''}" data-filter="complete" title="Complete">✓</button>
        <button type="button" class="hl-tab ${state.filter === 'improve' ? 'hl-active' : ''}" data-filter="improve" title="Important">⚡</button>
        <button type="button" class="hl-tab ${state.filter === 'critical' ? 'hl-active' : ''}" data-filter="critical" title="Critical">⚠</button>
      </div>
      <div class="hl-sections">${rows || '<p class="hl-muted" style="padding:16px">No items in this filter.</p>'}</div>
    `;

    body.querySelector('[data-start-opt]')?.addEventListener('click', () => {
      loadAnalysis();
    });
    body.querySelector('[data-sync]')?.addEventListener('click', () => syncProfile());
    body.querySelectorAll('[data-filter]').forEach((el) => {
      el.addEventListener('click', () => {
        state.filter = el.getAttribute('data-filter');
        renderBody();
      });
    });
    body.querySelectorAll('[data-sec-idx]').forEach((el) => {
      el.addEventListener('click', () => {
        state.selectedIndex = parseInt(el.getAttribute('data-sec-idx'), 10);
        state.page = 'detail';
        state.aiOptions = null;
        renderBody();
      });
    });
  }

  function bindDetail(shadow) {
    const body = shadow.querySelector('.hl-body');
    body.querySelector('[data-back]')?.addEventListener('click', (e) => {
      e.preventDefault();
      state.page = 'list';
      state.aiOptions = null;
      renderBody();
    });
    body.querySelector('[data-nav="prev"]')?.addEventListener('click', () => {
      if (state.selectedIndex > 0) {
        state.selectedIndex -= 1;
        state.aiOptions = null;
        renderBody();
      }
    });
    body.querySelector('[data-nav="next"]')?.addEventListener('click', () => {
      const list = filteredSections();
      if (state.selectedIndex < list.length - 1) {
        state.selectedIndex += 1;
        state.aiOptions = null;
        renderBody();
      }
    });
    body.querySelector('[data-gen-ai]')?.addEventListener('click', () => {
      const list = filteredSections();
      const sec = list[state.selectedIndex];
      if (sec) runAiGenerate(sec.key);
    });
    body.querySelectorAll('[data-copy-ai]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.getAttribute('data-copy-ai'), 10);
        const text = state.aiOptions[i]?.content;
        if (text) navigator.clipboard.writeText(text);
      });
    });
    body.querySelectorAll('[data-apply-ai]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.getAttribute('data-apply-ai'), 10);
        const text = state.aiOptions[i]?.content;
        const list = filteredSections();
        const sec = list[state.selectedIndex];
        if (text && sec) applyTextToLinkedIn(sec.key, text);
      });
    });
    body.querySelector('[data-go-section]')?.addEventListener('click', () => {
      const list = filteredSections();
      const sec = list[state.selectedIndex];
      if (sec) goToSection(sec.key);
    });
    body.querySelector('[data-edit-section]')?.addEventListener('click', () => {
      const list = filteredSections();
      const sec = list[state.selectedIndex];
      if (sec) goToSection(sec.key);
      setTimeout(() => {
        const btn =
          document.querySelector('button[aria-label*="Edit intro"]') ||
          document.querySelector('[data-view-name="profile-top-card-edit"]');
        btn?.click();
      }, 400);
    });
  }

  function renderJob(shadow) {
    const body = shadow.querySelector('.hl-body');
    if (!body) return;
    const j = state.jobDraft || scrapeJobForMode();
    state.jobDraft = j;
    const logo = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(location.hostname)}&sz=64`;

    body.innerHTML = `
      <div class="hl-job-card">
        <img src="${logo}" alt="" width="40" height="40" style="border-radius:8px;margin-bottom:8px" />
        <div class="hl-job-title">${esc(j.title)}</div>
        <div class="hl-job-meta">${esc(j.company || '')} · ${esc(j.location || '')}</div>
        ${j.salary ? `<div class="hl-job-meta">${esc(j.salary)}</div>` : ''}
      </div>
      <div class="hl-grid2">
        <button type="button" class="hl-primary" data-save="saved">Save Job</button>
        <button type="button" data-save="applied">Mark Applied</button>
        <button type="button" data-note="1">Add Note</button>
        <button type="button" data-similar="1">View Similar</button>
      </div>
      <textarea class="hl-note" placeholder="Add a note (saved with next Save)">${esc(j.notes || '')}</textarea>
      ${state.toast ? `<div class="hl-toast">${esc(state.toast)} <a href="#" data-open-tracker="1">View in Job Tracker</a></div>` : ''}
      <div class="hl-match">
        <strong>Resume match</strong>
        <p class="hl-muted">Uses your uploaded resume in Hirdlogic (ATS profile).</p>
        <button type="button" class="hl-btn-blue" data-match="1" style="width:100%">Check Match</button>
        ${
          state.matchResult
            ? `<pre style="white-space:pre-wrap;font-size:12px;margin-top:10px">${esc(JSON.stringify(state.matchResult, null, 2))}</pre>`
            : ''
        }
      </div>
    `;

    body.querySelector('[data-save="saved"]')?.addEventListener('click', () => {
      const note = body.querySelector('.hl-note')?.value?.trim();
      state.jobDraft = { ...j, notes: note || null };
      saveJobStatus('saved');
    });
    body.querySelector('[data-save="applied"]')?.addEventListener('click', () => {
      const note = body.querySelector('.hl-note')?.value?.trim();
      state.jobDraft = { ...j, notes: note || null };
      saveJobStatus('applied');
    });
    body.querySelector('[data-note]')?.addEventListener('click', () => {
      body.querySelector('.hl-note')?.focus();
    });
    body.querySelector('[data-similar]')?.addEventListener('click', () => {
      chrome.storage.local.get(['hirdlogic_app_origin'], (d) => {
        const origin = d.hirdlogic_app_origin || DEFAULT_APP;
        chrome.runtime.sendMessage({ type: 'OPEN_URL', url: `${origin}/dashboard` }, () => {});
      });
    });
    body.querySelector('[data-open-tracker]')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.storage.local.get(['hirdlogic_app_origin'], (d) => {
        const origin = d.hirdlogic_app_origin || DEFAULT_APP;
        chrome.runtime.sendMessage({ type: 'OPEN_URL', url: `${origin}/dashboard/job-tracker` }, () => {});
      });
    });
    body.querySelector('[data-match]')?.addEventListener('click', () => {
      runJobMatch(j.description || document.body.innerText.slice(0, 12000));
    });
  }

  function renderGeneral(shadow) {
    const body = shadow.querySelector('.hl-body');
    if (!body) return;
    body.innerHTML = `
      <div class="hl-general">
        <p><strong>Hirdlogic</strong></p>
        <p>Open your profile (<code>/in/</code>) for optimization, or a job listing page to save roles to your tracker.</p>
      </div>
    `;
  }

  function renderSignIn(shadow) {
    const body = shadow.querySelector('.hl-body');
    if (!body) return;
    const logo = chrome.runtime.getURL('assets/icon128.png');
    chrome.storage.local.get(['hirdlogic_app_origin'], (d) => {
      const origin = d.hirdlogic_app_origin || DEFAULT_APP;
      body.innerHTML = `
        <div class="hl-signin">
          <img src="${logo}" alt="Hirdlogic" />
          <h2>Sign in to view details</h2>
          <p>You are one step away from optimizing your profile and getting noticed by others</p>
          <button type="button" class="hl-btn-primary" data-signin="1">Sign in</button>
          <div class="hl-links">
            <a href="${origin}/terms" target="_blank" rel="noreferrer">Terms & Conditions</a>
            <a href="${origin}/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
          </div>
        </div>
      `;
      body.querySelector('[data-signin]')?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_URL', url: `${origin}/login` }, () => {});
      });
    });
  }

  function renderBody() {
    const host = document.getElementById('hirdlogic-extension-root');
    const shadow = host?.shadowRoot;
    if (!shadow) return;

    if (!state.auth?.authenticated) {
      renderSignIn(shadow);
      return;
    }

    const mode = state.mode;
    if (mode === 'profile') renderProfileViews(shadow);
    else if (mode === 'job') renderJob(shadow);
    else renderGeneral(shadow);
  }

  async function openPanel(shadow) {
    chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, (res) => {
      state.auth = res;
      state.mode = detectMode();
      if (state.auth?.authenticated && state.mode === 'profile' && !state.sections.length && !state.analysis) {
        loadAnalysis();
      }
      if (state.auth?.authenticated && state.mode === 'job') {
        state.jobDraft = scrapeJobForMode();
      }
      const panel = shadow.querySelector('.hl-panel');
      const toggle = shadow.querySelector('.hl-toggle .hl-arrow');
      panel?.classList.add('hl-open');
      if (toggle) toggle.textContent = '›';
      state.open = true;
      renderBody();
    });
  }

  function closePanel(shadow) {
    const panel = shadow.querySelector('.hl-panel');
    const toggle = shadow.querySelector('.hl-toggle .hl-arrow');
    panel?.classList.remove('hl-open');
    if (toggle) toggle.textContent = '‹';
    state.open = false;
  }

  function init() {
    if (document.getElementById('hirdlogic-extension-root')) return;

    const host = document.createElement('div');
    host.id = 'hirdlogic-extension-root';
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('sidebar/sidebar.css');
    shadow.appendChild(link);

    const wrap = document.createElement('div');
    wrap.className = 'hl-root';
    wrap.innerHTML = `
      <button type="button" class="hl-toggle" aria-label="Toggle Hirdlogic" title="Hirdlogic">
        <span class="hl-arrow">‹</span>
        <img class="hl-mark" src="${chrome.runtime.getURL('assets/icon48.png')}" alt="" />
      </button>
      <aside class="hl-panel" aria-label="Hirdlogic sidebar">
        <header class="hl-header">
          <div class="hl-header-left">
            <button type="button" class="hl-collapse" aria-label="Collapse">›</button>
            <img class="hl-brand-logo" src="${chrome.runtime.getURL('assets/icon48.png')}" alt="" />
            <span class="hl-brand-text">Hirdlogic</span>
          </div>
          <div class="hl-header-right">
            <button type="button" class="hl-btn-outline" data-upgrade="1">Upgrade to Premium</button>
            <button type="button" class="hl-icon-btn" data-menu="1" aria-label="Menu">⋮</button>
          </div>
        </header>
        <div class="hl-body"></div>
      </aside>
    `;
    shadow.appendChild(wrap);

    const toggleBtn = shadow.querySelector('.hl-toggle');
    const collapse = shadow.querySelector('.hl-collapse');
    const panel = shadow.querySelector('.hl-panel');

    toggleBtn?.addEventListener('click', () => {
      if (state.open) closePanel(shadow);
      else openPanel(shadow);
    });
    collapse?.addEventListener('click', () => closePanel(shadow));
    panel?.addEventListener('click', (e) => e.stopPropagation());

    shadow.querySelector('[data-upgrade]')?.addEventListener('click', () => {
      chrome.storage.local.get(['hirdlogic_app_origin'], (d) => {
        const origin = d.hirdlogic_app_origin || DEFAULT_APP;
        chrome.runtime.sendMessage({ type: 'OPEN_URL', url: `${origin}/dashboard` }, () => {});
      });
    });
    shadow.querySelector('[data-menu]')?.addEventListener('click', () => {
      alert('Hirdlogic — use the web dashboard for account settings.');
    });
  }

  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (msg.type === 'OPEN_SIDEBAR') {
      const host = document.getElementById('hirdlogic-extension-root');
      const shadow = host?.shadowRoot;
      if (shadow) openPanel(shadow);
      sendResponse({ ok: true });
    }
    return undefined;
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
