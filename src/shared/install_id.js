// Anonymous install id — used as the quota key for free-tier users so we
// can rate-limit without collecting PII. Generated once per install, stored
// in chrome.storage.local. Never sent anywhere except scrb.voiddo.com to
// authorize a free-tier API call.
//
// Format: 24 random url-safe chars. Crypto-strong (Math.random would be
// vulnerable to install-id collisions across millions of users).
self.JM_getInstallId = async function () {
  const api = self.JM_API;
  const stored = await api.storage.local.get(['jobmetaInstallId']);
  if (stored && stored.jobmetaInstallId) return stored.jobmetaInstallId;
  const buf = new Uint8Array(18);
  self.crypto.getRandomValues(buf);
  // base64url encoding without padding — 18 bytes → 24 chars.
  const id = btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await api.storage.local.set({ jobmetaInstallId: id });
  return id;
};
