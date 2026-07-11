import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useArionSync } from '@/hooks/useArionSync';

const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

function msUntilNext0005(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(0, 5, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

/**
 * Background ARION sync:
 * - On mount: if last sync > 60min ago, run syncToday().
 * - Schedules another sync at 00:05 the next day to refresh the new day's flights.
 */
export const ArionSyncBootstrap: React.FC = () => {
  const { user } = useAuth();
  const { hasCredentials, syncToday } = useArionSync();
  const ranOnceRef = useRef(false);

  // Initial sync if stale + recurring every 5 minutes
  useEffect(() => {
    if (!user || !hasCredentials) return;

    const tick = () => {
      const last = localStorage.getItem(`arion_last_sync_${user.id}`);
      const stale = !last || Date.now() - new Date(last).getTime() > SYNC_INTERVAL_MS;
      if (!stale) return;
      const idle = (cb: () => void) =>
        (window as any).requestIdleCallback?.(cb) ?? setTimeout(cb, 1500);
      idle(() => { syncToday().catch(() => {}); });
    };

    if (!ranOnceRef.current) {
      ranOnceRef.current = true;
      tick();
    }

    const interval = setInterval(tick, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, hasCredentials, syncToday]);

  // Midnight (00:05) re-sync
  useEffect(() => {
    if (!user || !hasCredentials) return;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const schedule = () => {
      if (cancelled) return;
      timeout = setTimeout(() => {
        syncToday().catch(() => {}).finally(() => {
          // Re-arm for the following day
          schedule();
        });
      }, msUntilNext0005());
    };
    schedule();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [user, hasCredentials, syncToday]);

  return null;
};

export default ArionSyncBootstrap;
