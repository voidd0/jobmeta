// jobmeta — service worker (background).
//
// Build step prepends src/shared/{constants,browser,install_id}.js so
// JM_CONFIG, JM_API, JM_getInstallId are global by the time this runs.
//
// Responsibilities:
//   1. First-install onboarding: open welcome tab so users set up their
//      profile before they hit "fill" on a Workday page and discover nothing.
//   2. Message routing for popup + content scripts + full app page.
//   3. License caching: 24h recheck + 72h offline grace, so we don't beat
//      on /license/jobmeta on every page nav.
//   4. Free-tier path: anonymous install_id authorizes capped calls.
//
// All fetch() targets are scrb.voiddo.com, declared in host_permissions.
(function () {
  'use strict';
  const { API_BASE, PRODUCT, FREE_LETTER_QUOTA, FREE_MATCH_QUOTA } = self.JM_CONFIG;
  const api = self.JM_API;

  const RECHECK_HOURS = 24;
  const OFFLINE_GRACE_HOURS = 72;

  api.raw.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
      api.raw.tabs.create({ url: api.raw.runtime.getURL('pages/welcome.html') });
    }
  });

  // Single message router. Each kind returns a Promise — sendResponse
  // pattern requires `return true` to keep the channel open in chrome.
  api.raw.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg !== 'object' || !msg.kind) return false;
    routeMessage(msg).then(sendResponse).catch((err) => {
      sendResponse({ ok: false, error: 'router_error', detail: String(err).slice(0, 200) });
    });
    return true;
  });

  async function routeMessage(msg) {
    switch (msg.kind) {
      case 'get-status':         return await getStatus();
      case 'open-options':       api.raw.runtime.openOptionsPage(); return { ok: true };
      case 'open-app':           api.raw.tabs.create({ url: api.raw.runtime.getURL('pages/app.html') }); return { ok: true };
      case 'open-upgrade':       api.raw.tabs.create({ url: self.JM_CONFIG.UPGRADE_URL }); return { ok: true };
      case 'check-license':      return await checkLicense(msg.key);
      case 'forget-license':     return await forgetLicense();
      case 'generate-letter':    return await generateLetter(msg.payload);
      case 'match-score':        return await matchScore(msg.payload);
      default:                   return { ok: false, error: 'unknown_kind' };
    }
  }

  async function getStatus() {
    const installId = await self.JM_getInstallId();
    const lic = await getStoredLicense();
    const profile = (await api.storage.sync.get(['jobmetaProfile']))?.jobmetaProfile || null;
    const usage = await getFreeUsage();
    return {
      ok: true,
      installId,
      version: self.JM_CONFIG.VERSION,
      plan: lic?.plan || 'free',
      licensePresent: !!lic?.key,
      quotaRemaining: lic?.meta?.quota_remaining ?? null,
      freeLettersUsed: usage.lettersUsed,
      freeMatchesUsed: usage.matchesUsed,
      freeLetterQuota: FREE_LETTER_QUOTA,
      freeMatchQuota:  FREE_MATCH_QUOTA,
      profilePresent: !!profile && !!(profile.firstName || profile.email),
    };
  }

  // --- license cache ---

  async function getStoredLicense() {
    const out = await api.storage.local.get(['jobmetaLicense']);
    return (out && out.jobmetaLicense) || null;
  }

  async function setStoredLicense(value) {
    return api.storage.local.set({ jobmetaLicense: value });
  }

  async function forgetLicense() {
    await api.storage.local.remove(['jobmetaLicense']);
    return { ok: true };
  }

  async function checkLicense(rawKey) {
    const key = (rawKey || '').trim();
    if (!key) return { valid: false, reason: 'empty_key' };
    try {
      const r = await fetch(`${API_BASE}/license/${PRODUCT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, product: PRODUCT }),
      });
      const data = await r.json().catch(() => ({}));
      if (data && data.valid) {
        await setStoredLicense({
          key, plan: data.plan, meta: data.meta || {}, checkedAt: Date.now(),
        });
      }
      return data;
    } catch (e) {
      const cached = await getStoredLicense();
      if (cached && cached.key === key) {
        const ageH = (Date.now() - (cached.checkedAt || 0)) / 36e5;
        if (ageH < OFFLINE_GRACE_HOURS) {
          return { valid: true, plan: cached.plan, meta: cached.meta, reason: 'offline_grace' };
        }
      }
      return { valid: false, reason: 'network_error' };
    }
  }

  // --- free quota tracking (client-side mirror; server is source of truth) ---
  // We track a local "month-year" counter so the popup can show usage instantly
  // without an API call. Server enforces the real cap, so this is for UX only.

  function thisMonthKey() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
  }

  async function getFreeUsage() {
    const out = await api.storage.local.get(['jobmetaFreeUsage']);
    const u = (out && out.jobmetaFreeUsage) || {};
    if (u.month !== thisMonthKey()) {
      return { month: thisMonthKey(), lettersUsed: 0, matchesUsed: 0 };
    }
    return { month: u.month, lettersUsed: u.lettersUsed || 0, matchesUsed: u.matchesUsed || 0 };
  }

  async function bumpFreeUsage(field) {
    const u = await getFreeUsage();
    u[field] = (u[field] || 0) + 1;
    await api.storage.local.set({ jobmetaFreeUsage: u });
  }

  // --- generate letter (free or pro) ---

  async function generateLetter(payload) {
    const lic = await getStoredLicense();
    if (lic && lic.key) return await generateLetterPro(lic, payload);
    return await generateLetterFree(payload);
  }

  async function generateLetterPro(lic, payload) {
    // Re-validate at most once per RECHECK_HOURS so cap-flips show fast.
    const ageH = (Date.now() - (lic.checkedAt || 0)) / 36e5;
    if (ageH > RECHECK_HOURS) {
      const v = await checkLicense(lic.key);
      if (!v || !v.valid) return { ok: false, error: 'license_invalid' };
    }
    try {
      const r = await fetch(`${API_BASE}/jobmeta/cover-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-License-Key': lic.key },
        body: JSON.stringify(payload),
      });
      return await unpackLetterResponse(r, lic);
    } catch (e) {
      return { ok: false, error: 'network_error' };
    }
  }

  async function generateLetterFree(payload) {
    const usage = await getFreeUsage();
    if (usage.lettersUsed >= FREE_LETTER_QUOTA) {
      return { ok: false, error: 'free_quota_exhausted', tier: 'letters' };
    }
    const installId = await self.JM_getInstallId();
    try {
      const r = await fetch(`${API_BASE}/jobmeta/cover-letter-free`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Install-Id': installId },
        body: JSON.stringify(payload),
      });
      const data = await unpackLetterResponse(r, null);
      if (data.ok) await bumpFreeUsage('lettersUsed');
      return data;
    } catch (e) {
      return { ok: false, error: 'network_error' };
    }
  }

  async function unpackLetterResponse(r, lic) {
    if (r.status === 402) return { ok: false, error: 'quota_exhausted' };
    if (r.status === 429) return { ok: false, error: 'daily_cap_hit' };
    if (r.status === 401 || r.status === 403) return { ok: false, error: 'license_invalid' };
    if (!r.ok) return { ok: false, error: `server_${r.status}` };
    const data = await r.json().catch(() => null);
    if (!data || !data.letter) return { ok: false, error: 'empty_response' };
    if (lic && typeof data.quota_remaining === 'number') {
      lic.meta = { ...(lic.meta || {}), quota_remaining: data.quota_remaining };
      await setStoredLicense({ ...lic, checkedAt: Date.now() });
    }
    return {
      ok: true,
      letter: data.letter,
      quota_remaining: data.quota_remaining ?? null,
      tier: lic ? lic.plan : 'free',
    };
  }

  // --- match-score (signature feature) ---

  async function matchScore(payload) {
    const lic = await getStoredLicense();
    if (lic && lic.key) {
      try {
        const r = await fetch(`${API_BASE}/jobmeta/match-score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-License-Key': lic.key },
          body: JSON.stringify(payload),
        });
        return await unpackMatchResponse(r);
      } catch (e) { return { ok: false, error: 'network_error' }; }
    }
    const usage = await getFreeUsage();
    if (usage.matchesUsed >= FREE_MATCH_QUOTA) {
      return { ok: false, error: 'free_quota_exhausted', tier: 'matches' };
    }
    const installId = await self.JM_getInstallId();
    try {
      const r = await fetch(`${API_BASE}/jobmeta/match-score-free`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Install-Id': installId },
        body: JSON.stringify(payload),
      });
      const data = await unpackMatchResponse(r);
      if (data.ok) await bumpFreeUsage('matchesUsed');
      return data;
    } catch (e) { return { ok: false, error: 'network_error' }; }
  }

  async function unpackMatchResponse(r) {
    if (r.status === 402) return { ok: false, error: 'quota_exhausted' };
    if (r.status === 429) return { ok: false, error: 'daily_cap_hit' };
    if (r.status === 401 || r.status === 403) return { ok: false, error: 'license_invalid' };
    if (!r.ok) return { ok: false, error: `server_${r.status}` };
    const data = await r.json().catch(() => null);
    if (!data) return { ok: false, error: 'empty_response' };
    return { ok: true, ...data };
  }
})();
