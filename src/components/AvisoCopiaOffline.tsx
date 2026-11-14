import { useEffect, useState } from 'react';
import { CloudOff } from 'lucide-react';
import { comprobarCopiaOffline, type EstadoCopia } from '@/lib/copiaOffline';

/**
 * Avisa de que la app todavía no está guardada entera en el móvil.
 *
 * Es un aviso PREVENTIVO: aparece mientras hay cobertura, que es cuando se
 * puede arreglar. Si no, el fallo se descubre en el peor momento posible —sin
 * señal en rampa y con la pantalla en blanco— y ahí ya no hay nada que hacer.
 */
export const AvisoCopiaOffline: React.FC = () => {
  const [estado, setEstado] = useState<EstadoCopia>('desconocido');

  useEffect(() => {
    let vivo = true;
    // Se espera un poco: el navegador guarda la copia justo después de
    // arrancar, y preguntar antes de tiempo daría un susto para nada.
    const t = setTimeout(() => {
      comprobarCopiaOffline().then((e) => { if (vivo) setEstado(e); });
    }, 8000);
    return () => { vivo = false; clearTimeout(t); };
  }, []);

  if (estado !== 'incompleta') return null;

  return (
    <div className="mx-3 rounded-lg border-2 border-warning/50 bg-warning/10 p-3 text-warning">
      <div className="flex items-start gap-2">
        <CloudOff size={20} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold">La app no está guardada entera en este móvil</p>
          <p className="opacity-90">
            Si la abres sin cobertura puede que no cargue nada. Déjala abierta un
            minuto con buena señal o wifi y se guardará sola.
          </p>
        </div>
      </div>
    </div>
  );
};
