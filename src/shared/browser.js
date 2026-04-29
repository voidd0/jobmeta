// Tiny polyfill — exposes `JM_API` as either `browser.*` (Firefox MV3) or
// `chrome.*` (Chrome/Edge). Both surfaces are largely API-compatible, but
// Firefox's storage returns a Promise while Chrome's takes a callback. The
// rest of jobmeta uses promise-style consistently, so we wrap chrome's
// callback APIs to return promises.
(function () {
  'use strict';
  const root = (typeof browser !== 'undefined' && browser.runtime) ? browser
             : (typeof chrome !== 'undefined' && chrome.runtime) ? chrome : null;
  if (!root) return;

  // Firefox returns promises natively for storage/runtime/tabs. Chrome only
  // started supporting promise-returning forms in MV3 — but to support older
  // Chrome (110+ per our minimum_chrome_version), we promisify by hand.
  const isFirefox = typeof browser !== 'undefined' && !!browser.runtime;

  function promisifyStorageArea(area) {
    return {
      get(keys) {
        if (isFirefox) return area.get(keys);
        return new Promise((resolve) => area.get(keys, resolve));
      },
      set(items) {
        if (isFirefox) return area.set(items);
        return new Promise((resolve) => area.set(items, resolve));
      },
      remove(keys) {
        if (isFirefox) return area.remove(keys);
        return new Promise((resolve) => area.remove(keys, resolve));
      },
    };
  }

  function sendMessage(msg) {
    if (isFirefox) return root.runtime.sendMessage(msg);
    return new Promise((resolve) => {
      try { root.runtime.sendMessage(msg, resolve); }
      catch (e) { resolve({ ok: false, error: 'sendMessage_failed' }); }
    });
  }

  self.JM_API = {
    runtime: {
      ...root.runtime,
      sendMessage,
    },
    storage: {
      local: promisifyStorageArea(root.storage.local),
      sync:  promisifyStorageArea(root.storage.sync),
    },
    tabs: root.tabs,
    raw: root,
    isFirefox,
  };
})();
