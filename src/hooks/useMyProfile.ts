import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * El nombre con el que el usuario firma en la app.
 *
 * Sale del perfil; si nadie lo ha puesto, se usa la parte del correo anterior
 * a la arroba, que es mejor que dejar un hueco. Se puede cambiar, pero no
 * escribiendo en la tabla: la única vía es `update_my_display_name`, que toca
 * esa columna y nada más. Con una política de UPDATE normal el usuario podría
 * escribir también `approved` y `blocked`, es decir, aprobarse a sí mismo.
 */
export function useMyProfile() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);

  const porDefecto = (user?.email ?? '').split('@')[0];

  const recargar = useCallback(async () => {
    if (!user) { setDisplayName(''); setLoading(false); return; }
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle();
    setDisplayName(data?.display_name || porDefecto);
    setLoading(false);
  }, [user, porDefecto]);

  useEffect(() => { void recargar(); }, [recargar]);

  const guardarNombre = useCallback(async (nuevo: string): Promise<void> => {
    const limpio = nuevo.trim().replace(/\s+/g, ' ');
    if (!limpio) throw new Error('El nombre no puede estar vacío');
    if (limpio.length > 60) throw new Error('El nombre no puede pasar de 60 caracteres');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc('update_my_display_name', { nuevo_nombre: limpio });
    if (error) throw new Error(error.message || 'No se pudo guardar el nombre');
    setDisplayName(limpio);
  }, []);

  return { displayName, loading, guardarNombre, recargar, email: user?.email ?? '' };
}
