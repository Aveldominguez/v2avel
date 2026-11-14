import { useEffect, useState } from 'react';
import { CloudOff } from 'lucide-react';
import { comprobarCopiaOffline, type EstadoCopia } from '@/lib/copiaOffline';
import { AvisoDestacado } from '@/components/AvisoDestacado';

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
    <AvisoDestacado
      className="mx-3"
      icono={<CloudOff size={20} />}
      titulo="La app no está guardada entera en este móvil"
    >
      Si la abres sin cobertura puede que no cargue nada. Déjala abierta un
      minuto con buena señal o wifi y se guardará sola.
    </AvisoDestacado>
  );
};
