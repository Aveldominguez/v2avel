import { useState, useCallback, useEffect, useRef } from 'react';

export const useAppUpdate = () => {
  const [updating, setUpdating] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const checkedRef = useRef(false);

  // Listen for SW update events
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      // A new SW took control — update is ready
      setUpdateAvailable(true);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Check existing registrations for waiting workers
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

    // Periodically check for updates (every 5 minutes)
    const interval = setInterval(async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      } catch {
        // ignore
      }
    }, 5 * 60 * 1000);

    // Also do an immediate check on mount (once)
    if (!checkedRef.current) {
      checkedRef.current = true;
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.update().catch(() => {}));
      });
    }

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      clearInterval(interval);
    };
  }, []);

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

      // Clear caches
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
  }, []);

  return { updating, updateAvailable, checkForUpdate, applyUpdate };
};
