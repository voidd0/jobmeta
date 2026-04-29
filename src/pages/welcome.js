// Welcome page — recorded consent + open options to set up profile.
(function () {
  'use strict';
  const api = self.JM_API;
  const btn = document.getElementById('consent-btn');
  btn.addEventListener('click', async () => {
    await api.storage.local.set({ jobmetaConsent: { v: 1, ts: Date.now() } });
    api.raw.runtime.openOptionsPage();
    window.close();
  });
})();
