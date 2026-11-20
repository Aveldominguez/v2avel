import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { recordarPermiso } from '@/config/puertas';

/**
 * Mantiene al día el permiso de conexión alternativa.
 *
 * Pregunta al servidor si este agente lo tiene concedido y lo apunta en el
 * móvil. Si la respuesta no coincide con lo que había, recarga: la conexión
 * con Supabase se monta una sola vez al arrancar, así que cambiar de puerta
 * obliga a volver a empezar.
 *
 * Esa recarga ocurre nada más entrar, antes de que nadie esté escribiendo
 * nada, y como mucho una vez por concesión. No se pierde trabajo: la escala
 * se guarda sola en el móvil de todos modos.
 *
 * Si no se puede preguntar —sin cobertura, o con la operadora bloqueando— no
 * se toca nada y se sigue con lo último que se supo. Es justo el caso para el
 * que existe todo esto: el permiso llega un día con wifi y sirve al día
 * siguiente, en la rampa, cuando ya no se puede preguntar.
 */
export const PuertaSync: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let vivo = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('puerta_alternativa')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!vivo || error || !data) return;

        if (recordarPermiso(Boolean(data.puerta_alternativa))) {
          window.location.reload();
        }
      } catch {
        // Sin servidor no se decide nada. Lo guardado sigue mandando.
      }
    })();

    return () => { vivo = false; };
  }, [user]);

  return null;
};
