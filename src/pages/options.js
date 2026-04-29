// jobmeta options — multi-profile editor.
//
// Storage model:
//   chrome.storage.sync.jobmetaProfiles      = { [name]: profile }
//   chrome.storage.sync.jobmetaActiveProfile = name
//   chrome.storage.sync.jobmetaProfile       = legacy single profile (kept
//                                              in sync with active for back-
//                                              compat with older content scripts)
//
// Free tier: 1 profile (named "default"). Pro tier: up to 5.
// We don't gate profile-creation client-side — let people draft profiles
// locally; the SW gates at submission time. This keeps the UI honest about
// what Pro unlocks rather than silently capping creation.
(function () {
  'use strict';
  const api = self.JM_API;
  const $ = (id) => document.getElementById(id);
  const FIELDS = ['firstName','lastName','email','phone','city','linkedin','github','portfolio','summary','tone','language'];
  const FREE_MAX_PROFILES = 1;
  const PRO_MAX_PROFILES = 5;

  let profiles = {};
  let active = 'default';
  let isPro = false;

  async function loadAll() {
    const status = await api.runtime.sendMessage({ kind: 'get-status' });
    isPro = status && status.plan && status.plan !== 'free';
    const out = await api.storage.sync.get(['jobmetaProfiles', 'jobmetaActiveProfile', 'jobmetaProfile']);
    profiles = (out && out.jobmetaProfiles) || {};
    active = (out && out.jobmetaActiveProfile) || 'default';
    // Migrate legacy single profile.
    if (Object.keys(profiles).length === 0 && out && out.jobmetaProfile) {
      profiles = { default: out.jobmetaProfile };
      active = 'default';
    }
    if (!profiles[active]) {
      profiles[active] = {};
    }
    paintProfilePicker();
    paintFormFromProfile(active);
  }

  function paintProfilePicker() {
    const list = $('profile-list');
    list.replaceChildren();
    const names = Object.keys(profiles);
    names.sort();
    names.forEach((name) => {
      const chip = document.createElement('span');
      chip.className = 'profile-chip' + (name === active ? ' active' : '');
      chip.textContent = name;
      chip.addEventListener('click', () => {
        if (name === active) return;
        captureFormToProfile(active);
        active = name;
        paintProfilePicker();
        paintFormFromProfile(active);
      });
      list.appendChild(chip);
    });
    const max = isPro ? PRO_MAX_PROFILES : FREE_MAX_PROFILES;
    $('profile-pill').textContent = `${names.length} of ${max} used`;
    $('add-profile').disabled  = names.length >= max;
    $('delete-profile').disabled = names.length <= 1;
    $('profiles-hint').textContent = isPro
      ? 'Pro: switch profiles per role-type (engineering, product, design). The floating "fill" button uses your active profile.'
      : 'free tier supports 1 profile. Pro unlocks up to 5 profiles for different role-types.';
  }

  function paintFormFromProfile(name) {
    const p = profiles[name] || {};
    FIELDS.forEach((f) => {
      const el = $(f);
      if (!el) return;
      el.value = p[f] != null ? String(p[f]) : '';
    });
    $('skills').value     = Array.isArray(p.skills)     ? p.skills.join(', ')     : (p.skills || '');
    $('experience').value = Array.isArray(p.experience) ? p.experience.join('\n') : (p.experience || '');
  }

  function captureFormToProfile(name) {
    const p = {};
    FIELDS.forEach((f) => { p[f] = ($(f)?.value || '').trim(); });
    p.skills     = $('skills').value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30);
    p.experience = $('experience').value.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 20);
    profiles[name] = p;
  }

  async function persist() {
    captureFormToProfile(active);
    const payload = {
      jobmetaProfiles: profiles,
      jobmetaActiveProfile: active,
      jobmetaProfile: profiles[active],
    };
    await api.storage.sync.set(payload);
  }

  $('save').addEventListener('click', async () => {
    await persist();
    const m = $('msg');
    m.textContent = 'saved';
    m.className = 'msg';
    setTimeout(() => { m.textContent = ''; }, 2000);
  });

  $('add-profile').addEventListener('click', async () => {
    const name = (prompt('name this profile (e.g. "engineering", "product"):') || '').trim();
    if (!name) return;
    if (profiles[name]) { alert('a profile with that name already exists.'); return; }
    captureFormToProfile(active);
    profiles[name] = {};
    active = name;
    paintProfilePicker();
    paintFormFromProfile(active);
    await persist();
  });

  $('rename-profile').addEventListener('click', async () => {
    const newName = (prompt(`rename "${active}" to:`, active) || '').trim();
    if (!newName || newName === active) return;
    if (profiles[newName]) { alert('that name already exists.'); return; }
    captureFormToProfile(active);
    profiles[newName] = profiles[active];
    delete profiles[active];
    active = newName;
    paintProfilePicker();
    await persist();
  });

  $('delete-profile').addEventListener('click', async () => {
    if (Object.keys(profiles).length <= 1) return;
    if (!confirm(`delete profile "${active}"? this can't be undone.`)) return;
    delete profiles[active];
    active = Object.keys(profiles)[0];
    paintProfilePicker();
    paintFormFromProfile(active);
    await persist();
  });

  $('export').addEventListener('click', async () => {
    captureFormToProfile(active);
    const blob = new Blob([JSON.stringify(profiles, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'jobmeta-profiles.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });

  loadAll();
})();
