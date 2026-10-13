import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Nombre con el que firma el usuario sus escalas.
 *
 * Sale del perfil (`profiles.display_name`); si nadie lo ha puesto, se usa la
 * parte del correo anterior a la arroba, que es mejor que dejar la casilla del
 * capataz en blanco. Se queda en memoria mientras dure la sesión: es un dato
 * que no cambia en mitad de una escala.
 */
export function useDisplayName(): string {
  const { user } = useAuth();
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    if (!user) { setNombre(''); return; }
    let cancelado = false;
    const porDefecto = (user.email ?? '').split('@')[0];
    setNombre(porDefecto);
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelado && data?.display_name) setNombre(data.display_name);
    })();
    return () => { cancelado = true; };
  }, [user]);

  return nombre;
}
