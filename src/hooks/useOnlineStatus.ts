import { useEffect, useState } from 'react';
import { subscribeConnectivity } from '@/lib/backendReachability';
import type { Connectivity } from '@/utils/connectivityState';

/**
 * Estado de conexión de la app.
 *
 * `isOnline` ya no significa "el móvil tiene red" sino "se llega al servidor",
 * que es lo que de verdad importa para decidir si se guarda contra el servidor
 * o en el móvil. Con un bloqueo de IP o un portal cautivo el teléfono tiene red
 * de sobra y no llega ni una petición.
 */
export const useOnlineStatus = () => {
  const [connectivity, setConnectivity] = useState<Connectivity>('online');
  useEffect(() => subscribeConnectivity(setConnectivity), []);
  return { isOnline: connectivity === 'online', connectivity };
};
