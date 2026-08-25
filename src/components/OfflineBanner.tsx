import { WifiOff, ServerCrash } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { connectivityMessage } from '@/utils/connectivityState';

/**
 * Aviso de que no se está llegando al servidor.
 *
 * Distingue quedarse sin cobertura de tener red pero no alcanzar el servidor,
 * porque se arreglan de forma distinta: lo segundo suele resolverse cambiando
 * de wifi a datos móviles, ya que el corte lo aplica cada operador por su lado.
 */
export const OfflineBanner = () => {
  const { connectivity } = useOnlineStatus();
  const msg = connectivityMessage(connectivity);
  if (!msg) return null;

  const Icono = connectivity === 'offline' ? WifiOff : ServerCrash;
  return (
    // El margen de la barra de estado va en línea y NO con `app-safe-header`:
    // esa clase fuerza el color de las cabeceras con !important y dejaba el
    // aviso del color del tema, texto negro sobre fondo oscuro e ilegible.
    <div
      className="fixed inset-x-0 top-0 z-[60] bg-amber-500 px-3 py-1.5 text-black shadow"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.375rem)' }}
    >
      <div className="mx-auto flex max-w-3xl items-start gap-2">
        <Icono className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 text-xs font-mono">
          <p className="font-bold">{msg.title}</p>
          <p className="leading-tight">{msg.detail}</p>
        </div>
      </div>
    </div>
  );
};
