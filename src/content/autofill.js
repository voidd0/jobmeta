// jobmeta — autofill content script. Renders a shadow-DOM floating action
// bar on the bottom-right of every supported ATS application page. Three
// actions: Fill, Cover Letter, Match Score.
//
// Selector strategy: each ATS has a `selectors` map matching jobmeta's
// internal field names (firstName, email, ...) to a list of CSS selectors
// to try in order. The list-of-selectors approach handles ATS quirks like
// Workday wrapping inputs in <div data-automation-id="..."> after a UI
// rebrand — we add the new selector to the head of the list without
// removing the old one.
(function () {
  'use strict';

  const ctx = window.__JOBMETA_PLATFORM__;
  if (!ctx) return;
  if (document.getElementById('jobmeta-host')) return;

  const api = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;
  const ICON_URL = api.runtime.getURL('icons/icon-48.png');

  // --- Per-ATS field selector maps ---
  // GENERIC array applies to any platform as a last-ditch fallback.
  const GENERIC = {
    firstName: ['input[id*="first" i][id*="name" i]', 'input[name*="first" i][name*="name" i]', 'input[autocomplete="given-name"]'],
    lastName:  ['input[id*="last" i][id*="name" i]',  'input[name*="last" i][name*="name" i]',  'input[autocomplete="family-name"]'],
    email:     ['input[type="email"]', 'input[autocomplete="email"]', 'input[id*="email" i]', 'input[name*="email" i]'],
    phone:     ['input[type="tel"]',   'input[autocomplete="tel"]',   'input[id*="phone" i]', 'input[name*="phone" i]'],
    linkedin:  ['input[id*="linkedin" i]', 'input[name*="linkedin" i]', 'input[aria-label*="LinkedIn" i]'],
    github:    ['input[id*="github" i]',   'input[name*="github" i]',   'input[aria-label*="GitHub" i]'],
    portfolio: ['input[id*="website" i]',  'input[name*="website" i]',  'input[id*="portfolio" i]', 'input[name*="portfolio" i]'],
    city:      ['input[autocomplete="address-level2"]', 'input[id*="city" i]', 'input[name*="city" i]'],
  };

  const SELECTORS = {
    workday: {
      firstName: ['input[data-automation-id="legalNameSection_firstName"]'],
      lastName:  ['input[data-automation-id="legalNameSection_lastName"]'],
      email:     ['input[data-automation-id="email"]'],
      phone:     ['input[data-automation-id="phone-number"]'],
      city:      ['input[data-automation-id="city"]'],
      linkedin:  ['input[data-automation-id="linkedin-url"]'],
    },
    greenhouse: {
      firstName: ['input#first_name', 'input[name="first_name"]'],
      lastName:  ['input#last_name',  'input[name="last_name"]'],
      email:     ['input#email',      'input[name="email"]'],
      phone:     ['input#phone',      'input[name="phone"]'],
      linkedin:  ['input[id*="linkedin" i]', 'input[name*="linkedin" i]', 'input[aria-label*="LinkedIn" i]'],
    },
    lever: {
      // Lever uses a single `name` field instead of first/last. Combine in applyProfile.
      name:      ['input[name="name"]'],
      email:     ['input[name="email"]'],
      phone:     ['input[name="phone"]'],
      org:       ['input[name="org"]'],
      linkedin:  ['input[name="urls[LinkedIn]"]', 'input[name*="LinkedIn" i]'],
      github:    ['input[name="urls[GitHub]"]'],
      portfolio: ['input[name="urls[Portfolio]"]'],
    },
    ashby: {
      firstName: ['input[name="_systemfield_firstname"]', 'input[aria-label*="First name" i]'],
      lastName:  ['input[name="_systemfield_lastname"]',  'input[aria-label*="Last name" i]'],
      email:     ['input[name="_systemfield_email"]',     'input[type="email"]'],
      phone:     ['input[name="_systemfield_phone"]',     'input[type="tel"]'],
      linkedin:  ['input[aria-label*="LinkedIn" i]'],
    },
    bamboohr: {
      firstName: ['input#firstName', 'input[name="firstName"]'],
      lastName:  ['input#lastName',  'input[name="lastName"]'],
      email:     ['input#email',     'input[name="email"]'],
      phone:     ['input#phone',     'input[name="phone"]'],
    },
    icims: {
      // iCIMS uses ICIMS-NS-prefixed ids and sometimes unprefixed.
      firstName: ['input#firstname', 'input[id*="firstname" i]', 'input[name*="firstname" i]'],
      lastName:  ['input#lastname',  'input[id*="lastname" i]',  'input[name*="lastname" i]'],
      email:     ['input#emailAddress', 'input[id*="email" i]'],
      phone:     ['input#homePhone',    'input[id*="phone" i]'],
      city:      ['input[id*="city" i]'],
    },
    jobvite: {
      firstName: ['input[name="firstName"]', 'input[id*="firstname" i]'],
      lastName:  ['input[name="lastName"]',  'input[id*="lastname" i]'],
      email:     ['input[name="email"]',     'input[type="email"]'],
      phone:     ['input[name="phone"]',     'input[type="tel"]'],
      linkedin:  ['input[name*="linkedin" i]'],
    },
    smartrecruiters: {
      // SmartRecruiters has data-test attributes in newer designs.
      firstName: ['input[data-test="first-name"]', 'input[name="firstName"]'],
      lastName:  ['input[data-test="last-name"]',  'input[name="lastName"]'],
      email:     ['input[data-test="email"]',      'input[type="email"]'],
      phone:     ['input[data-test="phone"]',      'input[type="tel"]'],
      city:      ['input[data-test="city"]',       'input[name*="city" i]'],
      linkedin:  ['input[name*="linkedin" i]'],
    },
    successfactors: {
      // SAP SuccessFactors uses dynamic ids; aria-label is the most reliable.
      firstName: ['input[aria-label*="First Name" i]', 'input[id*="firstName" i]'],
      lastName:  ['input[aria-label*="Last Name" i]',  'input[id*="lastName" i]'],
      email:     ['input[aria-label*="Email" i]',      'input[type="email"]'],
      phone:     ['input[aria-label*="Phone" i]',      'input[type="tel"]'],
      city:      ['input[aria-label*="City" i]'],
    },
    taleo: {
      // Taleo's nightmare: ids look like `formElement.descriptor.firstName`.
      firstName: ['input[id*="firstName" i]', 'input[name*="firstName" i]'],
      lastName:  ['input[id*="lastName" i]',  'input[name*="lastName" i]'],
      email:     ['input[id*="email" i]',     'input[type="email"]'],
      phone:     ['input[id*="phone" i]',     'input[type="tel"]'],
    },
    breezy: {
      firstName: ['input[name="first_name"]', 'input#first_name'],
      lastName:  ['input[name="last_name"]',  'input#last_name'],
      email:     ['input[name="email"]',      'input[type="email"]'],
      phone:     ['input[name="phone"]',      'input[type="tel"]'],
      linkedin:  ['input[name*="linkedin" i]'],
    },
    breezy_alt: { /* same as breezy */ },
  };
  // Mirror breezy_alt to breezy to avoid duplication.
  SELECTORS.breezy_alt = SELECTORS.breezy;

  function setField(selectors, value) {
    if (!value) return false;
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      // Native setter so React/Vue's tracked-value invariant fires onChange.
      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, value); else el.value = value;
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur',   { bubbles: true }));
      return true;
    }
    return false;
  }

  async function loadProfile() {
    return new Promise((resolve) => {
      try {
        api.storage.sync.get(['jobmetaProfile', 'jobmetaProfiles', 'jobmetaActiveProfile'], (out) => {
          // Multi-profile model: jobmetaProfiles is { [name]: profile }
          // jobmetaActiveProfile is the chosen name. Falls back to the legacy single profile.
          if (out && out.jobmetaProfiles && out.jobmetaActiveProfile) {
            const p = out.jobmetaProfiles[out.jobmetaActiveProfile];
            if (p) return resolve(p);
          }
          resolve((out && out.jobmetaProfile) || null);
        });
      } catch { resolve(null); }
    });
  }

  function applyProfile(profile) {
    const map = SELECTORS[ctx.platform] || {};
    const filled = {};
    // Special case: Lever combines first + last into single `name` field.
    if (ctx.platform === 'lever' && map.name) {
      const full = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
      filled.name = setField(map.name, full);
    }
    for (const [key, sels] of Object.entries(map)) {
      if (key === 'name') continue;
      filled[key] = setField(sels, profile[key]);
    }
    // Fall back to GENERIC selectors for fields the platform map missed.
    for (const [key, sels] of Object.entries(GENERIC)) {
      if (filled[key]) continue;
      filled[key] = setField(sels, profile[key]);
    }
    return filled;
  }

  function extractJobDescription() {
    // Heuristic: prefer the largest single text block on the page, capped to
    // 8K chars (the prompt enforces server-side length too). ATS pages often
    // wrap descriptions in <div class="description">, but selector names
    // differ wildly per vendor, so we measure text density instead.
    const candidates = document.querySelectorAll(
      'div[class*="description" i], div[class*="job-detail" i], div[class*="content" i], section, article'
    );
    let best = null, bestLen = 0;
    candidates.forEach((el) => {
      const txt = (el.innerText || '').trim();
      if (txt.length > bestLen && txt.length < 12000) {
        best = txt; bestLen = txt.length;
      }
    });
    if (!best) {
      // Last resort: pull body text minus header/nav/footer.
      const skip = new Set(['HEADER', 'NAV', 'FOOTER', 'ASIDE', 'SCRIPT', 'STYLE']);
      const txt = Array.from(document.body.children)
        .filter((el) => !skip.has(el.tagName))
        .map((el) => (el.innerText || '').trim())
        .join('\n')
        .slice(0, 12000);
      if (txt.length > 200) best = txt;
    }
    return best ? best.slice(0, 8000) : '';
  }

  function extractJobMeta() {
    // Best-effort scrape of role + employer from page title / breadcrumbs.
    const title = document.title || '';
    let job_title = '';
    let company = ctx.employer || '';
    const sep = title.match(/^(.*?)\s+[-–|]\s+(.*)$/);
    if (sep) {
      // Pick the longer half as job_title.
      if (sep[1].length >= sep[2].length) {
        job_title = sep[1].trim();
        if (!company) company = sep[2].trim();
      } else {
        job_title = sep[2].trim();
        if (!company) company = sep[1].trim();
      }
    } else {
      job_title = title.trim();
    }
    return { job_title: job_title.slice(0, 200), company: company.slice(0, 200) };
  }

  // --- Shadow-DOM UI ---
  const host = document.createElement('div');
  host.id = 'jobmeta-host';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .fab {
      position: fixed; right: 18px; bottom: 18px; z-index: 2147483647;
      display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 14px; border-radius: 999px; cursor: pointer;
      background: linear-gradient(90deg, #6366f1, #8b5cf6); color: #fff;
      border: 0; font-weight: 700; font-size: 13px; letter-spacing: .04em;
      box-shadow: 0 8px 24px rgba(99,102,241,.45);
      transition: transform .12s ease, filter .12s ease;
    }
    .btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
    .btn:disabled { opacity: .55; cursor: not-allowed; }
    .btn img { width: 18px; height: 18px; border-radius: 4px; }
    .btn.ghost {
      background: #11111a; color: #c4b5fd;
      border: 1px solid rgba(167,139,250,.4);
      box-shadow: 0 4px 12px rgba(0,0,0,.4);
    }
    .panel {
      position: fixed; right: 18px; bottom: 80px; z-index: 2147483647;
      width: 420px; max-height: 540px; overflow-y: auto;
      background: #0d0d14; color: #f3f3f8;
      border: 1px solid rgba(167,139,250,.35); border-radius: 14px;
      padding: 16px; font-size: 13px; line-height: 1.55;
      box-shadow: 0 16px 48px rgba(0,0,0,.6);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .panel h4 { margin: 0 0 10px; font-size: 12px; color: #fbbf24; letter-spacing: .08em; text-transform: uppercase; }
    .panel pre {
      white-space: pre-wrap; word-break: break-word; margin: 0;
      font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12.5px;
      background: #0a0a10; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,.06);
    }
    .panel .row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
    .panel button { font-family: inherit; font-size: 12px; padding: 6px 10px;
      background: #1f1f2e; color: #c4b5fd; border: 1px solid rgba(167,139,250,.35);
      border-radius: 6px; cursor: pointer; }
    .panel button:hover { filter: brightness(1.15); }
    .panel .quota-tag { font-size: 11px; color: #94a3b8; margin-left: 8px; }
    .toast { font-size: 12px; color: #6ee7b7; margin-top: 6px; max-width: 280px; text-align: right; }
    .toast.err { color: #fca5a5; }
    .score-ring {
      display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
    }
    .score-circle {
      width: 64px; height: 64px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 22px; color: #fff;
      background: conic-gradient(#10b981 var(--p, 0%), rgba(255,255,255,.08) 0);
    }
    .score-circle::before {
      content: ''; position: absolute;
    }
    .score-meta strong { font-size: 16px; display: block; }
    .score-meta span { font-size: 12px; color: #94a3b8; }
    .score-list { margin: 8px 0 0; padding-left: 16px; }
    .score-list li { margin: 4px 0; }
    .score-list.miss li { color: #fca5a5; }
    .score-list.hit  li { color: #6ee7b7; }
    .upgrade-cta {
      display: inline-block; margin-top: 10px; padding: 8px 14px;
      background: linear-gradient(90deg, #f59e0b, #ef4444);
      color: #0d0d14; font-weight: 800; border-radius: 8px;
      text-decoration: none; font-size: 12px; letter-spacing: .04em;
    }
  `;
  shadow.appendChild(style);

  const fab = document.createElement('div');
  fab.className = 'fab';

  const fillBtn = document.createElement('button');
  fillBtn.className = 'btn';
  const logo = document.createElement('img'); logo.src = ICON_URL; logo.alt = '';
  fillBtn.append(logo, document.createTextNode(`fill ${ctx.platform}`));

  const matchBtn = document.createElement('button');
  matchBtn.className = 'btn ghost';
  matchBtn.textContent = 'match score →';

  const letterBtn = document.createElement('button');
  letterBtn.className = 'btn ghost';
  letterBtn.textContent = 'cover letter →';

  const toast = document.createElement('div'); toast.className = 'toast';

  fab.append(matchBtn, letterBtn, fillBtn, toast);
  shadow.appendChild(fab);
  document.documentElement.appendChild(host);

  function setToast(text, isErr) {
    toast.textContent = text;
    toast.className = 'toast' + (isErr ? ' err' : '');
  }

  fillBtn.addEventListener('click', async () => {
    const profile = await loadProfile();
    if (!profile) {
      setToast('set up your profile in jobmeta options first', true);
      api.runtime.sendMessage({ kind: 'open-options' });
      return;
    }
    const filled = applyProfile(profile);
    const ok = Object.values(filled).filter(Boolean).length;
    setToast(ok ? `filled ${ok} fields` : 'no matching fields found', !ok);
  });

  letterBtn.addEventListener('click', async () => {
    const profile = await loadProfile();
    if (!profile) {
      setToast('set up your profile first', true);
      api.runtime.sendMessage({ kind: 'open-options' });
      return;
    }
    const meta = extractJobMeta();
    const desc = extractJobDescription();
    if (!desc || desc.length < 60) {
      setToast("couldn't read the job description on this page", true);
      return;
    }
    setToast('drafting your letter…', false);
    letterBtn.disabled = true;
    try {
      const resp = await api.runtime.sendMessage({
        kind: 'generate-letter',
        payload: {
          job_title: meta.job_title,
          company: meta.company || ctx.employer || '',
          job_description: desc,
          candidate_name: [profile.firstName, profile.lastName].filter(Boolean).join(' '),
          candidate_summary: profile.summary || '',
          candidate_skills: profile.skills || [],
          candidate_experience: profile.experience || [],
          tone: profile.tone || 'professional',
          language: profile.language || 'en',
        },
      });
      if (!resp || !resp.ok) {
        if (resp?.error === 'free_quota_exhausted') {
          showUpgradePanel('letters');
          setToast('');
        } else {
          setToast((resp && resp.error) || 'generation failed', true);
        }
        return;
      }
      showLetterPanel(resp.letter, resp.quota_remaining, resp.tier);
      setToast('');
    } catch (e) {
      setToast('network error', true);
    } finally {
      letterBtn.disabled = false;
    }
  });

  matchBtn.addEventListener('click', async () => {
    const profile = await loadProfile();
    if (!profile) {
      setToast('set up your profile first', true);
      api.runtime.sendMessage({ kind: 'open-options' });
      return;
    }
    const meta = extractJobMeta();
    const desc = extractJobDescription();
    if (!desc || desc.length < 60) {
      setToast("couldn't read the job description on this page", true);
      return;
    }
    setToast('scoring…', false);
    matchBtn.disabled = true;
    try {
      const resp = await api.runtime.sendMessage({
        kind: 'match-score',
        payload: {
          job_title: meta.job_title,
          company: meta.company || ctx.employer || '',
          job_description: desc,
          candidate_summary: profile.summary || '',
          candidate_skills: profile.skills || [],
          candidate_experience: profile.experience || [],
          language: profile.language || 'en',
        },
      });
      if (!resp || !resp.ok) {
        if (resp?.error === 'free_quota_exhausted') {
          showUpgradePanel('matches');
          setToast('');
        } else {
          setToast((resp && resp.error) || 'score failed', true);
        }
        return;
      }
      showScorePanel(resp);
      setToast('');
    } catch (e) {
      setToast('network error', true);
    } finally {
      matchBtn.disabled = false;
    }
  });

  function clearPanel() {
    const old = shadow.querySelector('.panel');
    if (old) old.remove();
  }

  function showLetterPanel(letter, quota, tier) {
    clearPanel();
    const panel = document.createElement('div');
    panel.className = 'panel';
    const h = document.createElement('h4');
    h.textContent = tier === 'free'
      ? `cover letter · free tier`
      : (quota == null ? 'cover letter' : `cover letter · ${quota} left`);
    const pre = document.createElement('pre');
    pre.textContent = letter;
    const row = document.createElement('div'); row.className = 'row';
    const copy = document.createElement('button');
    copy.textContent = 'copy';
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(letter); copy.textContent = 'copied'; }
      catch { copy.textContent = 'copy failed'; }
    });
    const close = document.createElement('button');
    close.textContent = 'close';
    close.addEventListener('click', () => panel.remove());
    row.append(copy, close);
    panel.append(h, pre, row);
    shadow.appendChild(panel);
  }

  function showScorePanel(resp) {
    clearPanel();
    const panel = document.createElement('div');
    panel.className = 'panel';
    const h = document.createElement('h4');
    h.textContent = 'match score';
    panel.appendChild(h);

    const ring = document.createElement('div'); ring.className = 'score-ring';
    const circle = document.createElement('div');
    circle.className = 'score-circle';
    const score = Math.max(0, Math.min(100, Math.round(resp.score || 0)));
    circle.style.setProperty('--p', `${score}%`);
    circle.textContent = String(score);
    const meta = document.createElement('div'); meta.className = 'score-meta';
    const verdict = score >= 80 ? 'strong fit' : score >= 60 ? 'reasonable fit' : score >= 40 ? 'partial fit' : 'weak fit';
    const strong = document.createElement('strong'); strong.textContent = verdict;
    const span = document.createElement('span'); span.textContent = resp.summary || '';
    meta.append(strong, span);
    ring.append(circle, meta);
    panel.appendChild(ring);

    if (Array.isArray(resp.hits) && resp.hits.length) {
      const lbl = document.createElement('div'); lbl.style.cssText = 'margin-top:10px;font-size:12px;color:#94a3b8'; lbl.textContent = 'matched';
      const ul = document.createElement('ul'); ul.className = 'score-list hit';
      resp.hits.slice(0, 6).forEach((h) => { const li = document.createElement('li'); li.textContent = h; ul.appendChild(li); });
      panel.append(lbl, ul);
    }
    if (Array.isArray(resp.gaps) && resp.gaps.length) {
      const lbl = document.createElement('div'); lbl.style.cssText = 'margin-top:10px;font-size:12px;color:#94a3b8'; lbl.textContent = 'gaps to address';
      const ul = document.createElement('ul'); ul.className = 'score-list miss';
      resp.gaps.slice(0, 6).forEach((g) => { const li = document.createElement('li'); li.textContent = g; ul.appendChild(li); });
      panel.append(lbl, ul);
    }

    const row = document.createElement('div'); row.className = 'row';
    const close = document.createElement('button'); close.textContent = 'close';
    close.addEventListener('click', () => panel.remove());
    row.appendChild(close);
    panel.appendChild(row);

    shadow.appendChild(panel);
  }

  function showUpgradePanel(kind) {
    clearPanel();
    const panel = document.createElement('div');
    panel.className = 'panel';
    const h = document.createElement('h4');
    h.textContent = 'free tier maxed out';
    const p = document.createElement('div');
    p.style.cssText = 'font-size:13px;line-height:1.6;margin:6px 0 10px';
    p.textContent = kind === 'matches'
      ? 'you used all 5 free match scores this month. Pro removes the cap and unlocks AI question-rewriter + interview-prep.'
      : 'you used all 10 free cover letters this month. Pro gives unlimited letters + multi-profile + sync.';
    const a = document.createElement('a');
    a.className = 'upgrade-cta';
    a.href = 'https://extensions.voiddo.com/jobmeta/pricing/';
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'upgrade to Pro · $4.99/mo →';
    const row = document.createElement('div'); row.className = 'row';
    const close = document.createElement('button'); close.textContent = 'close';
    close.addEventListener('click', () => panel.remove());
    row.appendChild(close);
    panel.append(h, p, a, row);
    shadow.appendChild(panel);
  }
})();
