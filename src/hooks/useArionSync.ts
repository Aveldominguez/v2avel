import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ArionStatus {
  has_login: boolean;
  arion_login: string | null;
  arion_station: string;
  arion_last_sync: string | null;
}

interface SyncResult {
  synced: number;
  date: string;
}

export type ArionSyncError =
  | 'no_credentials'
  | 'arion_auth_failed'
  | 'arion_flights_failed'
  | 'forbidden'
  | 'network'
  | 'unknown';

function lastSyncKey(userId: string) {
  return `arion_last_sync_${userId}`;
}

function todayDdMmYyyy(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function dateToDdMmYyyy(iso: string) {
  const part = iso.slice(0, 10);
  const m = part.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return todayDdMmYyyy();
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function useArionSync() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ArionStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<ArionSyncError | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const loadStatus = useCallback(async () => {
    if (!user) {
      setStatus(null);
      return null;
    }
    const { data, error } = await supabase.functions.invoke('arion-credentials', {
      method: 'GET',
    });
    if (error) {
      console.error('[arion] load status failed', error);
      return null;
    }
    const s = data as ArionStatus;
    setStatus(s);
    if (s?.arion_last_sync) setLastSync(s.arion_last_sync);
    return s;
  }, [user]);

  useEffect(() => {
    loadStatus();
    if (user) {
      const v = localStorage.getItem(lastSyncKey(user.id));
      if (v) setLastSync((prev) => prev ?? v);
    }
  }, [user, loadStatus]);

  const hasCredentials = !!status?.has_login;

  const saveCredentials = useCallback(
    async (login: string, password: string, station: string) => {
      const { data, error } = await supabase.functions.invoke('arion-credentials', {
        method: 'POST',
        body: { arion_login: login, arion_password: password, arion_station: station },
      });
      if (error || (data as any)?.error) {
        console.error('[arion] save error', error || (data as any)?.error);
        return false;
      }
      await loadStatus();
      return true;
    },
    [loadStatus],
  );

  const runSync = useCallback(
    async (flightDateDdMmYyyy: string): Promise<SyncResult | null> => {
      if (!user) return null;
      if (syncingRef.current) return null;

      syncingRef.current = true;
      setSyncing(true);
      setSyncError(null);

      try {
        const { data, error } = await supabase.functions.invoke('sync-arion-flights', {
          body: { flight_date: flightDateDdMmYyyy },
        });

        if (error) {
          const msg = (error as any)?.message || '';
          let code: ArionSyncError = 'unknown';
          try {
            const ctx = (error as any)?.context;
            const body = ctx?.body ? await ctx.body : null;
            const parsed = typeof body === 'string' ? JSON.parse(body) : body;
            const e = parsed?.error;
            if (e === 'arion_auth_failed') code = 'arion_auth_failed';
            else if (e === 'arion_flights_failed') code = 'arion_flights_failed';
            else if (e === 'forbidden') code = 'forbidden';
            else if (e === 'missing_credentials') code = 'no_credentials';
          } catch { /* ignore */ }
          if (code === 'unknown' && /Failed to fetch|NetworkError/i.test(msg)) code = 'network';
          setSyncError(code);
          return null;
        }

        if ((data as any)?.error) {
          const e = (data as any).error;
          setSyncError(
            e === 'arion_auth_failed' || e === 'arion_flights_failed' || e === 'forbidden'
              ? e
              : e === 'missing_credentials'
                ? 'no_credentials'
                : 'unknown',
          );
          return null;
        }

        const result = data as SyncResult;
        const nowIso = new Date().toISOString();
        try { localStorage.setItem(lastSyncKey(user.id), nowIso); } catch { /* ignore */ }
        setLastSync(nowIso);
        return result;
      } catch (err) {
        console.error('[arion] sync error', err);
        setSyncError('unknown');
        return null;
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }
    },
    [user],
  );

  const syncToday = useCallback(() => runSync(todayDdMmYyyy()), [runSync]);
  const syncDate = useCallback((isoDate: string) => runSync(dateToDdMmYyyy(isoDate)), [runSync]);

  return {
    hasCredentials,
    status,
    lastSync,
    syncing,
    syncError,
    syncToday,
    syncDate,
    saveCredentials,
    reloadStatus: loadStatus,
  };
}
