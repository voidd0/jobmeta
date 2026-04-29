// jobmeta popup. Reads status from the SW (single source of truth),
// renders plan/quota, handles license paste + upgrade CTA.
(function () {
  'use strict';
  const api = self.JM_API;
  const $ = (id) => document.getElementById(id);

  function setQuotaUI(filled, max, valEl, fillEl) {
    valEl.textContent = `${filled} / ${max}`;
    const pct = max > 0 ? Math.min(100, Math.round((filled / max) * 100)) : 0;
    fillEl.style.width = `${pct}%`;
    if (pct >= 100) fillEl.classList.add('over');
    else fillEl.classList.remove('over');
  }

  function paint(state) {
    if (!state || !state.ok) return;
    $('ver').textContent = `v${state.version}`;

    const isPro = state.plan && state.plan !== 'free';
    const badge = $('plan-badge');
    if (isPro) {
      badge.textContent = state.plan.toUpperCase();
      badge.classList.add('pro');
      $('quota-block').hidden = true;
      $('pro-block').hidden = false;
      const sub = state.plan === 'pack' && typeof state.quotaRemaining === 'number'
        ? `${state.quotaRemaining} letters left in pack`
        : 'monthly subscription · unlimited';
      $('pro-sub').textContent = sub;
      $('upgrade-cta').hidden = true;
      $('forget-btn').hidden = false;
    } else {
      badge.textContent = 'FREE';
      badge.classList.remove('pro');
      $('quota-block').hidden = false;
      $('pro-block').hidden = true;
      setQuotaUI(state.freeLettersUsed, state.freeLetterQuota, $('letters-val'), $('letters-fill'));
      setQuotaUI(state.freeMatchesUsed, state.freeMatchQuota, $('matches-val'), $('matches-fill'));
      $('upgrade-cta').hidden = false;
      $('forget-btn').hidden = true;
    }
  }

  async function refresh() {
    const state = await api.runtime.sendMessage({ kind: 'get-status' });
    paint(state);
  }

  $('open-app').addEventListener('click', () => {
    api.runtime.sendMessage({ kind: 'open-app' });
    window.close();
  });
  $('open-options').addEventListener('click', () => {
    api.runtime.sendMessage({ kind: 'open-options' });
    window.close();
  });
  $('upgrade-cta').addEventListener('click', () => {
    api.runtime.sendMessage({ kind: 'open-upgrade' });
    window.close();
  });

  $('license-toggle').addEventListener('click', () => {
    const block = $('license-block');
    const body = $('license-body');
    const open = !body.hidden;
    body.hidden = open;
    block.classList.toggle('open', !open);
  });

  $('check-btn').addEventListener('click', async () => {
    const key = $('license-key').value.trim();
    const msg = $('license-msg');
    if (!key) { msg.textContent = 'paste your key'; msg.className = 'hint err'; return; }
    msg.textContent = 'checking…';
    msg.className = 'hint';
    const resp = await api.runtime.sendMessage({ kind: 'check-license', key });
    if (resp && resp.valid) {
      msg.textContent = `verified · ${resp.plan}`;
      msg.className = 'hint ok';
      await refresh();
    } else {
      msg.textContent = `invalid (${(resp && resp.reason) || 'unknown'})`;
      msg.className = 'hint err';
    }
  });

  $('license-key').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('check-btn').click();
  });

  $('forget-btn').addEventListener('click', async () => {
    await api.runtime.sendMessage({ kind: 'forget-license' });
    $('license-msg').textContent = 'signed out';
    $('license-msg').className = 'hint ok';
    await refresh();
  });

  refresh();
})();
