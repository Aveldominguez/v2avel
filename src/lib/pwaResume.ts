// PWA resume recovery for iOS standalone:
// iOS suspends/kills the WebView when backgrounded. On resume the page can
// come back blank. These listeners force a clean reload in those scenarios.

const RELOAD_FLAG = 'pwa-resume-reloaded';
const HIDDEN_AT_KEY = 'pwa-hidden-at';
const RELOAD_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export const installPwaResumeRecovery = () => {
  if (typeof window === 'undefined') return;

  // 1) Back-forward cache restore (iOS) → force a fresh render once per session.
  window.addEventListener('pageshow', (event) => {
    const e = event as PageTransitionEvent;
    if (e.persisted) {
      try {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, '1');
          window.location.reload();
        }
      } catch {
        window.location.reload();
      }
    }
  });

  // 2) Long background → reload to recover from a frozen WebView.
  document.addEventListener('visibilitychange', () => {
    try {
      if (document.visibilityState === 'hidden') {
        sessionStorage.setItem(HIDDEN_AT_KEY, String(Date.now()));
        return;
      }
      if (document.visibilityState === 'visible') {
        const hiddenAtRaw = sessionStorage.getItem(HIDDEN_AT_KEY);
        sessionStorage.removeItem(HIDDEN_AT_KEY);
        if (!hiddenAtRaw) return;
        const hiddenFor = Date.now() - Number(hiddenAtRaw);
        if (hiddenFor > RELOAD_THRESHOLD_MS) {
          window.location.reload();
        }
      }
    } catch {
      /* ignore */
    }
  });

  // Clear the pageshow flag once the app has rendered cleanly.
  window.addEventListener('load', () => {
    setTimeout(() => {
      try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignore */ }
    }, 3000);
  });
};
