/**
 * Guarded service-worker registration.
 *
 * Registers /sw.js only in the published production app. Refuses
 * registration (and unregisters any leftover SW) in dev, in iframe
 * previews, in Lovable preview hosts, or when ?sw=off is set.
 */
export function registerAppServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const url = new URL(window.location.href);
  const host = window.location.hostname;
  const inIframe = window.self !== window.top;
  const isLovablePreview =
    host.startsWith('id-preview--') ||
    host.startsWith('preview--') ||
    host === 'lovableproject.com' ||
    host.endsWith('.lovableproject.com') ||
    host === 'lovableproject-dev.com' ||
    host.endsWith('.lovableproject-dev.com') ||
    host === 'beta.lovable.dev' ||
    host.endsWith('.beta.lovable.dev');
  const refused =
    !import.meta.env.PROD ||
    inIframe ||
    isLovablePreview ||
    url.searchParams.get('sw') === 'off';

  if (refused) {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((r) => {
        if (r.active?.scriptURL?.endsWith('/sw.js')) r.unregister().catch(() => undefined);
      }))
      .catch(() => undefined);
    return;
  }

  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
}
