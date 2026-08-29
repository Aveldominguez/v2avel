import { useEffect, useRef } from 'react';
import { subscribeConnectivity } from '@/lib/backendReachability';
import { connectivityMessage, type Connectivity } from '@/utils/connectivityState';
import { toast } from '@/hooks/use-toast';

/**
 * Avisa SÓLO cuando el estado de la conexión cambia, no mientras dura.
 *
 * Antes no había forma de enterarse de que el servidor había vuelto: el aviso
 * simplemente desaparecía. Y un aviso permanente en pantalla estorba; uno al
 * cambiar informa y se quita solo.
 */
export function useConnectivityToasts(): void {
  const anterior = useRef<Connectivity | null>(null);

  useEffect(() => subscribeConnectivity((estado) => {
    const previo = anterior.current;
    anterior.current = estado;
    // La primera notificación es el estado actual al suscribirse, no un cambio.
    if (previo === null || previo === estado) return;

    if (estado === 'online') {
      toast({
        title: '✅ Conexión restablecida',
        description: 'Se están enviando los cambios que se guardaron en el móvil.',
      });
      return;
    }

    const msg = connectivityMessage(estado);
    if (msg) toast({ title: msg.title, description: msg.detail, variant: 'destructive' });
  }), []);
}
