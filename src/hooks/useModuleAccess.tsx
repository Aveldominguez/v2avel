import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ModuleKey } from '@/types/equipment';

interface ModuleAccess {
  loading: boolean;
  rampa: boolean;
  equipos: boolean;
  isAdmin: boolean;
}

const CACHE_KEY = (uid: string) => `module_access_cache_v1_${uid}`;

const readCache = (uid: string): Omit<ModuleAccess, 'loading'> | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY(uid));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const writeCache = (uid: string, val: Omit<ModuleAccess, 'loading'>) => {
  try { localStorage.setItem(CACHE_KEY(uid), JSON.stringify(val)); } catch { /* ignore */ }
};

/**
 * Returns which modules the current user can access.
 * Hydrated synchronously from localStorage so it works offline.
 */
export const useModuleAccess = (): ModuleAccess => {
  const { user, loading: authLoading } = useAuth();

  const initial: ModuleAccess = (() => {
    if (user) {
      const cached = readCache(user.id);
      if (cached) return { loading: false, ...cached };
    }
    return { loading: true, rampa: false, equipos: false, isAdmin: false };
  })();

  const [state, setState] = useState<ModuleAccess>(initial);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (authLoading) return;
      if (!user) {
        if (!cancelled) setState({ loading: false, rampa: false, equipos: false, isAdmin: false });
        return;
      }

      // Always serve cached value immediately if present
      const cached = readCache(user.id);
      if (cached && !cancelled) setState({ loading: false, ...cached });

      try {
        const [{ data: roleRow }, { data: accessRows }] = await Promise.all([
          supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle(),
          supabase.from('user_module_access').select('module').eq('user_id', user.id),
        ]);

        const isAdmin = !!roleRow;
        const modules = new Set<ModuleKey>((accessRows || []).map((r: { module: ModuleKey }) => r.module));
        const next = {
          isAdmin,
          rampa: isAdmin || modules.has('rampa'),
          equipos: isAdmin || modules.has('equipos'),
        };
        writeCache(user.id, next);
        if (!cancelled) setState({ loading: false, ...next });
      } catch {
        // Offline / network error — keep cached or default values, just stop loading
        if (!cancelled && !cached) setState({ loading: false, rampa: false, equipos: false, isAdmin: false });
      }
    };
    run();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return state;
};
