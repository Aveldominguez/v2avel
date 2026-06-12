import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ArionProfile {
  arion_login: string | null;
  arion_password: string | null;
  arion_station: string | null;
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
  // Accepts "yyyy-MM-dd" or full ISO
  const part = iso.slice(0, 10);
  const m = part.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return todayDdMmYyyy();
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function useArionSync() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ArionProfile | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<ArionSyncError | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const syncingRef = useRef(false);

  // Load profile credentials
  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return null;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('arion_login, arion_password, arion_station, arion_last_sync')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      console.error('[arion] load profile failed', error);
      return null;
    }
    const p = (data || null) as ArionProfile | null;
    setProfile(p);
    if (p?.arion_last_sync) setLastSync(p.arion_last_sync);
    return p;
  }, [user]);

  useEffect(() => {
    loadProfile();
    // Hydrate from localStorage too (so offline UI works)
    if (user) {
      const v = localStorage.getItem(lastSyncKey(user.id));
      if (v) setLastSync((prev) => prev ?? v);
    }
  }, [user, loadProfile]);

  const hasCredentials = !!(profile?.arion_login && profile?.arion_password);

  const runSync = useCallback(
    async (flightDateDdMmYyyy: string): Promise<SyncResult | null> => {
      if (!user) return null;
      if (syncingRef.current) return null;

      // Always read latest profile to ensure credentials are current
      const p = profile ?? (await loadProfile());
      if (!p?.arion_login || !p?.arion_password) {
        setSyncError('no_credentials');
        return null;
      }

      syncingRef.current = true;
      setSyncing(true);
      setSyncError(null);

      try {
        const { data, error } = await supabase.functions.invoke('sync-arion-flights', {
          body: {
            arion_login: p.arion_login,
            arion_password: p.arion_password,
            station_code: (p.arion_station || 'MAD').toUpperCase(),
            flight_date: flightDateDdMmYyyy,
          },
        });

        if (error) {
          // supabase-js wraps non-2xx as FunctionsHttpError. Try to extract code.
          const msg = (error as any)?.message || '';
          let code: ArionSyncError = 'unknown';
          try {
            const ctx = (error as any)?.context;
            const body = ctx?.body ? await ctx.body : null;
            const parsed = typeof body === 'string' ? JSON.parse(body) : body;
            if (parsed?.error === 'arion_auth_failed') code = 'arion_auth_failed';
            else if (parsed?.error === 'arion_flights_failed') code = 'arion_flights_failed';
          } catch { /* ignore */ }
          if (code === 'unknown' && /Failed to fetch|NetworkError/i.test(msg)) code = 'network';
          setSyncError(code);
          return null;
        }

        if ((data as any)?.error) {
          const e = (data as any).error;
          setSyncError(
            e === 'arion_auth_failed' || e === 'arion_flights_failed' ? e : 'unknown',
          );
          return null;
        }

        const result = data as SyncResult;
        const nowIso = new Date().toISOString();
        try {
          localStorage.setItem(lastSyncKey(user.id), nowIso);
        } catch { /* ignore */ }
        setLastSync(nowIso);
        return result;
      } catch (err: any) {
        console.error('[arion] sync error', err);
        setSyncError('unknown');
        return null;
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }
    },
    [user, profile, loadProfile],
  );

  const syncToday = useCallback(
    () => runSync(todayDdMmYyyy()),
    [runSync],
  );
  const syncDate = useCallback(
    (isoDate: string) => runSync(dateToDdMmYyyy(isoDate)),
    [runSync],
  );

  return {
    hasCredentials,
    profile,
    lastSync,
    syncing,
    syncError,
    syncToday,
    syncDate,
    reloadProfile: loadProfile,
  };
}
