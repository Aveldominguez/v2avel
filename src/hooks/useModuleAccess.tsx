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

/**
 * Returns which modules the current user can access.
 * Admins always have access to both.
 */
export const useModuleAccess = (): ModuleAccess => {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<ModuleAccess>({
    loading: true, rampa: false, equipos: false, isAdmin: false,
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (authLoading) return;
      if (!user) {
        if (!cancelled) setState({ loading: false, rampa: false, equipos: false, isAdmin: false });
        return;
      }

      const [{ data: roleRow }, { data: accessRows }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle(),
        supabase.from('user_module_access').select('module').eq('user_id', user.id),
      ]);

      const isAdmin = !!roleRow;
      const modules = new Set<ModuleKey>((accessRows || []).map((r: any) => r.module));
      if (!cancelled) {
        setState({
          loading: false,
          isAdmin,
          rampa: isAdmin || modules.has('rampa'),
          equipos: isAdmin || modules.has('equipos'),
        });
      }
    };
    run();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return state;
};
