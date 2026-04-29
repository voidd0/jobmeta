// jobmeta — ATS detector. Identifies the platform from the URL alone
// because URL is stable while DOM markup gets rebranded every quarter.
// Sets window.__JOBMETA_PLATFORM__ for autofill.js to pick up.
//
// Each entry contains:
//   id        — internal slug used by SELECTORS in autofill.js
//   match(host, path) — predicate; returns { employer } or null
//
// Order matters only for hosts that overlap (none currently). Adding a new
// ATS = one entry here + one entry in autofill.js SELECTORS.
(function () {
  'use strict';
  if (window.__JOBMETA_PLATFORM__) return;

  const host = location.hostname.toLowerCase();
  const path = location.pathname;

  const ATS_RULES = [
    {
      id: 'workday',
      match: (h) => h.endsWith('.myworkdayjobs.com') || h.endsWith('myworkdayjobs.com'),
      employer: (h) => h.split('.')[0] || null,
    },
    {
      id: 'greenhouse',
      match: (h) => h.endsWith('greenhouse.io'),
      employer: (_h, p) => (p.match(/^\/([^/]+)\//) || [])[1] || null,
    },
    {
      id: 'lever',
      match: (h) => h.endsWith('lever.co'),
      employer: (_h, p) => (p.match(/^\/([^/]+)\//) || [])[1] || null,
    },
    {
      id: 'ashby',
      match: (h) => h.endsWith('ashbyhq.com'),
      employer: (_h, p) => (p.match(/^\/([^/]+)\//) || [])[1] || null,
    },
    {
      id: 'bamboohr',
      match: (h) => h.endsWith('bamboohr.com'),
      employer: (h) => { const p = h.split('.'); return p.length > 2 ? p[0] : null; },
    },
    {
      id: 'icims',
      match: (h) => h.endsWith('icims.com'),
      // iCIMS uses subdomain-as-tenant: <tenant>.icims.com or careers-<tenant>.icims.com
      employer: (h) => h.split('.')[0].replace(/^careers-/, '') || null,
    },
    {
      id: 'jobvite',
      match: (h) => h.endsWith('jobvite.com'),
      employer: (_h, p) => (p.match(/^\/([^/]+)\//) || [])[1] || null,
    },
    {
      id: 'smartrecruiters',
      match: (h) => h.endsWith('smartrecruiters.com'),
      employer: (_h, p) => (p.match(/^\/([^/]+)\//) || [])[1] || null,
    },
    {
      id: 'successfactors',
      match: (h) => h.endsWith('successfactors.com'),
      employer: (h) => h.split('.')[0] || null,
    },
    {
      id: 'taleo',
      match: (h) => h.endsWith('taleo.net'),
      employer: (h) => h.split('.')[0].replace(/^.*?[-_]/, '') || null,
    },
    {
      id: 'breezy',
      match: (h) => h.endsWith('breezy.hr') || h.endsWith('breezyhr.com'),
      employer: (h) => h.split('.')[0] || null,
    },
  ];

  let platform = null, employer = null;
  for (const rule of ATS_RULES) {
    if (rule.match(host, path)) {
      platform = rule.id;
      try { employer = rule.employer(host, path); } catch { employer = null; }
      break;
    }
  }
  if (!platform) return;

  window.__JOBMETA_PLATFORM__ = {
    platform,
    employer,
    href: location.href,
    detectedAt: Date.now(),
  };
})();
