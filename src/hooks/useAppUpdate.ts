import { useState, useCallback } from 'react';

export const useAppUpdate = () => {
  const [updating, setUpdating] = useState(false);

  const checkForUpdate = useCallback(async () => {
    setUpdating(true);
    try {
      // Unregister all service workers to force fresh content
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      }

      // Clear caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Reload with cache bust
      window.location.reload();
    } catch (e) {
      console.error('Update failed:', e);
      // Fallback: just reload
      window.location.reload();
    } finally {
      setUpdating(false);
    }
  }, []);

  return { updating, checkForUpdate };
};
