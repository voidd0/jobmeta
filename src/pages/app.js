// jobmeta full-page app — three tabs: match / write / saved.
//
// All work goes through the SW message router so the same auth / quota
// logic applies whether the request comes from the popup, the floating
// content-script button, or this page.
(function () {
  'use strict';
  const api = self.JM_API;
  const $ = (id) => document.getElementById(id);

  // ---- tab routing ----
  const tabs = document.querySelectorAll('.tab');
  const panels = {
    match: $('panel-match'),
    write: $('panel-write'),
    saved: $('panel-saved'),
  };
  function goTo(name) {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    Object.entries(panels).forEach(([k, el]) => { el.hidden = k !== name; });
    if (name === 'saved') renderSaved();
    location.hash = `#${name}`;
  }
  tabs.forEach((t) => t.addEventListener('click', () => goTo(t.dataset.tab)));
  if (location.hash && panels[location.hash.slice(1)]) goTo(location.hash.slice(1));

  // ---- status pill ----
  async function refreshStatus() {
    const status = await api.runtime.sendMessage({ kind: 'get-status' });
    if (!status || !status.ok) return;
    $('ver').textContent = `v${status.version}`;
    const pill = $('status-pill');
    if (status.plan && status.plan !== 'free') {
      pill.textContent = status.plan.toUpperCase();
      pill.classList.add('pro');
    } else {
      pill.textContent = 'FREE';
      pill.classList.remove('pro');
    }
  }
  refreshStatus();

  // ---- profile fetcher ----
  async function getActiveProfile() {
    const out = await api.storage.sync.get(['jobmetaProfiles', 'jobmetaActiveProfile', 'jobmetaProfile']);
    if (out && out.jobmetaProfiles && out.jobmetaActiveProfile) {
      return out.jobmetaProfiles[out.jobmetaActiveProfile] || null;
    }
    return (out && out.jobmetaProfile) || null;
  }

  function paintQuotaError(msg, kind) {
    msg.replaceChildren();
    msg.className = 'msg err';
    const span = document.createElement('span');
    span.textContent = kind === 'matches'
      ? 'free monthly match-score quota maxed (5/mo). '
      : 'free monthly letter quota maxed (10/mo). ';
    const a = document.createElement('a');
    a.href = self.JM_CONFIG.UPGRADE_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'upgrade to Pro →';
    msg.append(span, a);
  }

  // ---- match tab ----
  $('match-btn').addEventListener('click', async () => {
    const jd = $('match-jd').value.trim();
    const msg = $('match-msg');
    if (jd.length < 60) {
      msg.textContent = 'paste at least 60 characters of the job description.';
      msg.className = 'msg err';
      return;
    }
    const profile = await getActiveProfile();
    if (!profile || !(profile.firstName || profile.email)) {
      msg.textContent = 'set up your profile first.';
      msg.className = 'msg err';
      setTimeout(() => location.assign('options.html'), 700);
      return;
    }
    msg.textContent = 'scoring against your profile…';
    msg.className = 'msg';
    $('match-btn').disabled = true;
    try {
      const resp = await api.runtime.sendMessage({
        kind: 'match-score',
        payload: {
          job_title: $('match-title').value.trim(),
          company:   $('match-company').value.trim(),
          job_description: jd,
          candidate_summary: profile.summary || '',
          candidate_skills: profile.skills || [],
          candidate_experience: profile.experience || [],
          language: profile.language || 'en',
        },
      });
      if (!resp || !resp.ok) {
        if (resp && resp.error === 'free_quota_exhausted') {
          paintQuotaError(msg, 'matches');
        } else {
          msg.textContent = (resp && resp.error) || 'score failed';
          msg.className = 'msg err';
        }
        return;
      }
      paintScore(resp);
      msg.textContent = '';
    } catch (e) {
      msg.textContent = 'network error';
      msg.className = 'msg err';
    } finally {
      $('match-btn').disabled = false;
    }
  });

  function paintScore(resp) {
    $('match-empty').hidden = true;
    $('score-card').hidden = false;
    const score = Math.max(0, Math.min(100, Math.round(resp.score || 0)));
    $('score-num').textContent = String(score);
    const arc = $('score-arc');
    const circumference = 2 * Math.PI * 52;
    arc.setAttribute('stroke-dasharray', `${(score / 100) * circumference} ${circumference}`);
    const verdict = score >= 80 ? 'strong fit'
                  : score >= 60 ? 'reasonable fit'
                  : score >= 40 ? 'partial fit' : 'weak fit';
    $('score-verdict').textContent = verdict;
    $('score-summary').textContent = resp.summary || '';
    fillList($('score-hits'), resp.hits || []);
    fillList($('score-gaps'), resp.gaps || []);
    window.__lastMatch = { score, verdict, ...resp, jd: $('match-jd').value };
  }
  function fillList(ul, items) {
    ul.replaceChildren();
    items.slice(0, 8).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
  }

  $('score-write-letter').addEventListener('click', () => {
    $('write-jd').value      = $('match-jd').value;
    $('write-title').value   = $('match-title').value;
    $('write-company').value = $('match-company').value;
    goTo('write');
  });

  // ---- write tab ----
  (async () => {
    const profile = await getActiveProfile();
    if (profile) {
      if (profile.tone)     $('write-tone').value     = profile.tone;
      if (profile.language) $('write-language').value = profile.language;
    }
  })();

  $('write-btn').addEventListener('click', async () => {
    const jd = $('write-jd').value.trim();
    const msg = $('write-msg');
    if (jd.length < 60) {
      msg.textContent = 'paste at least 60 characters of the job description.';
      msg.className = 'msg err';
      return;
    }
    const profile = await getActiveProfile();
    if (!profile || !(profile.firstName || profile.email)) {
      msg.textContent = 'set up your profile first.';
      msg.className = 'msg err';
      setTimeout(() => location.assign('options.html'), 700);
      return;
    }
    msg.textContent = 'drafting your letter…';
    msg.className = 'msg';
    $('write-btn').disabled = true;
    try {
      const resp = await api.runtime.sendMessage({
        kind: 'generate-letter',
        payload: {
          job_title: $('write-title').value.trim() || 'this role',
          company:   $('write-company').value.trim() || 'your company',
          job_description: jd,
          candidate_name: [profile.firstName, profile.lastName].filter(Boolean).join(' '),
          candidate_summary: profile.summary || '',
          candidate_skills: profile.skills || [],
          candidate_experience: profile.experience || [],
          tone:     $('write-tone').value,
          language: $('write-language').value,
        },
      });
      if (!resp || !resp.ok) {
        if (resp && resp.error === 'free_quota_exhausted') {
          paintQuotaError(msg, 'letters');
        } else {
          msg.textContent = (resp && resp.error) || 'generation failed';
          msg.className = 'msg err';
        }
        return;
      }
      paintLetter(resp);
      msg.textContent = '';
    } catch (e) {
      msg.textContent = 'network error';
      msg.className = 'msg err';
    } finally {
      $('write-btn').disabled = false;
    }
  });

  function paintLetter(resp) {
    $('write-empty').hidden = true;
    $('letter-card').hidden = false;
    $('letter-body').textContent = resp.letter;
    window.__lastLetter = {
      letter: resp.letter,
      job_title: $('write-title').value,
      company:   $('write-company').value,
      jd: $('write-jd').value,
      tier: resp.tier,
    };
  }

  $('letter-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('letter-body').textContent);
      $('letter-copy').textContent = 'copied';
      setTimeout(() => { $('letter-copy').textContent = 'copy'; }, 1500);
    } catch { $('letter-copy').textContent = 'failed'; }
  });

  $('letter-save').addEventListener('click', async () => {
    if (!window.__lastLetter) return;
    await saveItem({
      kind: 'letter',
      ts: Date.now(),
      title: window.__lastLetter.job_title || 'untitled role',
      company: window.__lastLetter.company || '',
      body: window.__lastLetter.letter,
    });
    $('letter-save').textContent = 'saved';
    setTimeout(() => { $('letter-save').textContent = 'save'; }, 1500);
  });

  // ---- saved tab ----
  async function getSaved() {
    const out = await api.storage.local.get(['jobmetaSaved']);
    return Array.isArray(out && out.jobmetaSaved) ? out.jobmetaSaved : [];
  }
  async function saveItem(item) {
    const arr = await getSaved();
    arr.unshift(item);
    await api.storage.local.set({ jobmetaSaved: arr.slice(0, 100) });
  }
  async function clearSaved() {
    await api.storage.local.set({ jobmetaSaved: [] });
  }
  async function renderSaved() {
    const list = $('saved-list');
    const items = await getSaved();
    list.replaceChildren();
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const ic = document.createElement('div'); ic.className = 'empty-icon'; ic.textContent = '⌘';
      const p1 = document.createElement('p'); p1.textContent = 'nothing saved yet.';
      const p2 = document.createElement('p'); p2.className = 'empty-sub';
      p2.textContent = 'draft a letter or score a match, then click "save" to keep it here.';
      empty.append(ic, p1, p2);
      list.appendChild(empty);
      $('saved-actions').hidden = true;
      return;
    }
    $('saved-actions').hidden = false;
    items.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'saved-item';
      const head = document.createElement('div'); head.className = 'saved-head';
      const meta = document.createElement('div');
      const title = document.createElement('div'); title.className = 'saved-title';
      title.textContent = item.title + (item.company ? ` · ${item.company}` : '');
      const sub = document.createElement('div'); sub.className = 'saved-meta';
      sub.textContent = `${item.kind} · ${new Date(item.ts).toLocaleString()}`;
      meta.append(title, sub);
      head.appendChild(meta);
      const body = document.createElement('div'); body.className = 'saved-body';
      body.textContent = item.body || JSON.stringify(item, null, 2);
      const actions = document.createElement('div'); actions.className = 'saved-actions-inner';
      const copyBtn = document.createElement('button'); copyBtn.className = 'btn-ghost-sm';
      copyBtn.textContent = 'copy';
      copyBtn.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(item.body || ''); copyBtn.textContent = 'copied'; }
        catch { copyBtn.textContent = 'failed'; }
        setTimeout(() => { copyBtn.textContent = 'copy'; }, 1500);
      });
      const delBtn = document.createElement('button'); delBtn.className = 'btn-ghost-sm';
      delBtn.textContent = 'delete';
      delBtn.addEventListener('click', async () => {
        const arr = await getSaved();
        arr.splice(idx, 1);
        await api.storage.local.set({ jobmetaSaved: arr });
        renderSaved();
      });
      actions.append(copyBtn, delBtn);
      card.append(head, body, actions);
      list.appendChild(card);
    });
  }

  $('saved-clear').addEventListener('click', async () => {
    if (!confirm('clear all saved letters and scores? this can\'t be undone.')) return;
    await clearSaved();
    renderSaved();
  });
})();
