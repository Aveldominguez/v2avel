// iOS lifecycle recovery for standalone mode:
// never reload automatically on resume. Reload loops were leaving the app
// unusable and could wipe an in-progress offline scale. This module only
// records lifecycle transitions and broadcasts a lightweight resume event.

const HIDDEN_AT_KEY = 'pwa-hidden-at';
const RESUME_EVENT = 'app-resume';

export const installPwaResumeRecovery = () => {
  if (typeof window === 'undefined') return;

  window.addEventListener('pageshow', (event) => {
    const e = event as PageTransitionEvent;
    if (e.persisted) {
      window.dispatchEvent(new CustomEvent(RESUME_EVENT));
    }
  });

  document.addEventListener('visibilitychange', () => {
    try {
      if (document.visibilityState === 'hidden') {
        sessionStorage.setItem(HIDDEN_AT_KEY, String(Date.now()));
        return;
      }
      if (document.visibilityState === 'visible') {
        sessionStorage.removeItem(HIDDEN_AT_KEY);
        window.dispatchEvent(new CustomEvent(RESUME_EVENT));
      }
    } catch {
      /* ignore */
    }
  });
};
