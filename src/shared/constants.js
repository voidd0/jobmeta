// jobmeta — shared constants. Loaded as a plain global script so popup,
// options, welcome, and the service worker all see the same JM_CONFIG.
//
// API_BASE points at the existing scrb backend (one backend, many products).
// FREE_LETTER_QUOTA is the per-month free allowance keyed off install_id.
// FREE_MATCH_QUOTA is the match-meter free allowance — both tighter than
// the paid daily caps to keep the upgrade curve visible without being mean.
self.JM_CONFIG = Object.freeze({
  API_BASE: 'https://scrb.voiddo.com/api/v1/ext',
  PRODUCT: 'jobmeta',
  VERSION: '2.0.0',
  UPGRADE_URL: 'https://extensions.voiddo.com/jobmeta/pricing/',
  PRIVACY_URL: 'https://extensions.voiddo.com/jobmeta/privacy/',
  TERMS_URL:   'https://extensions.voiddo.com/jobmeta/terms/',
  REFUND_URL:  'https://extensions.voiddo.com/jobmeta/refund/',
  HOMEPAGE:    'https://extensions.voiddo.com/jobmeta/',

  FREE_LETTER_QUOTA: 10,
  FREE_MATCH_QUOTA:  5,

  // ATS catalogue. The key is our internal id; host is for detection.
  // label is what we surface in the floating button ("fill workday").
  ATS: [
    { id: 'workday',         host: 'myworkdayjobs.com', label: 'Workday' },
    { id: 'greenhouse',      host: 'greenhouse.io',     label: 'Greenhouse' },
    { id: 'lever',           host: 'lever.co',          label: 'Lever' },
    { id: 'ashby',           host: 'ashbyhq.com',       label: 'Ashby' },
    { id: 'bamboohr',        host: 'bamboohr.com',      label: 'BambooHR' },
    { id: 'icims',           host: 'icims.com',         label: 'iCIMS' },
    { id: 'jobvite',         host: 'jobvite.com',       label: 'Jobvite' },
    { id: 'smartrecruiters', host: 'smartrecruiters.com', label: 'SmartRecruiters' },
    { id: 'successfactors',  host: 'successfactors.com', label: 'SuccessFactors' },
    { id: 'taleo',           host: 'taleo.net',         label: 'Taleo' },
    { id: 'breezy',          host: 'breezy.hr',         label: 'Breezy' },
    { id: 'breezy_alt',      host: 'breezyhr.com',      label: 'Breezy' },
  ],

  TONES: ['professional', 'warm', 'concise', 'enthusiastic'],
  LANGUAGES: [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'it', label: 'Italiano' },
    { code: 'pt', label: 'Português' },
    { code: 'nl', label: 'Nederlands' },
    { code: 'pl', label: 'Polski' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
    { code: 'zh', label: '中文' },
  ],
});
