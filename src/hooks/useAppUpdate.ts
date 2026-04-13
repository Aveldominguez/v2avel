import { useState, useCallback, useEffect, useRef } from 'react';
import { APP_VERSION } from '@/config/version';

interface RemoteVersion {
  version: string;
  changelog: string[];
}

export const useAppUpdate = () => {
  const [updating, setUpdating] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [remoteChangelog, setRemoteChangelog] = useState<string[]>([]);
  const [remoteVersion, setRemoteVersion] = useState<string>('');
  const checkedRef = useRef(false);

  const fetchRemoteVersion = useCallback(async () => {
    try {
      const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const data: RemoteVersion = await res.json();
      if (data.version && data.version !== APP_VERSION) {
        setUpdateAvailable(true);
        setRemoteVersion(data.version);
        setRemoteChangelog(data.changelog || []);

        // Send local notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Nueva versión disponible', {
            body: `v${data.version} — ${(data.changelog || [])[0] || 'Mejoras y correcciones'}`,
            icon: '/icons/icon-192x192.png',
            tag: 'app-update',
          });
        }
      }
    } catch {
      // ignore network errors
    }
  }, []);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    // Also listen for SW updates as a fallback
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const reg of registrations) {
          if (reg.waiting) {
            setUpdateAvailable(true);
            return;
          }
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          });
        }
      });
    }

    // Fetch remote version immediately on mount
    if (!checkedRef.current) {
      checkedRef.current = true;
      fetchRemoteVersion();
    }

    // Check every 3 minutes
    const interval = setInterval(fetchRemoteVersion, 3 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchRemoteVersion]);

  const applyUpdate = useCallback(async () => {
    setUpdating(true);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          await reg.update();
        }
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      window.location.reload();
    } catch {
      window.location.reload();
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    setUpdating(true);
    try {
      await fetchRemoteVersion();

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      window.location.reload();
    } catch {
      window.location.reload();
    } finally {
      setUpdating(false);
    }
  }, [fetchRemoteVersion]);

  return { updating, updateAvailable, remoteVersion, remoteChangelog, checkForUpdate, applyUpdate };
};
