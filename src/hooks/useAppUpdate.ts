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
          const items = data.changelog || [];
          const body = items.length > 0
            ? items.map((it, i) => `• ${it}`).join('\n')
            : 'Mejoras y correcciones';
          new Notification(`Nueva versión v${data.version} disponible`, {
            body,
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
    // Defer first version check so it doesn't compete with initial data fetch
    if (!checkedRef.current) {
      checkedRef.current = true;
      const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
      if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(() => { fetchRemoteVersion(); });
      } else {
        setTimeout(() => { fetchRemoteVersion(); }, 1500);
      }
    }

    // Check every 3 minutes
    const interval = setInterval(fetchRemoteVersion, 3 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchRemoteVersion]);

  const hardReload = useCallback(async () => {
    try {
      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }

      // Clear all caches
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch {
      // ignore errors, reload anyway
    }
    window.location.reload();
  }, []);

  const applyUpdate = useCallback(async () => {
    setUpdating(true);
    await hardReload();
  }, [hardReload]);

  const checkForUpdate = useCallback(async () => {
    setUpdating(true);
    try {
      await fetchRemoteVersion();
    } catch {
      // ignore
    }
    await hardReload();
  }, [fetchRemoteVersion, hardReload]);

  return { updating, updateAvailable, remoteVersion, remoteChangelog, checkForUpdate, applyUpdate };
};
