import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { APP_CHANGELOG, APP_VERSION } from '@/config/version';

const CLAVE = 'version_vista';

/**
 * Qué ha cambiado, DESPUÉS de haberse actualizado.
 *
 * El aviso de "nueva versión disponible" sólo salta si la app está abierta
 * justo cuando se publica. Lo normal es cerrarla y, al volver a abrirla, el
 * navegador ya ha instalado la versión nueva por su cuenta: para cuando se
 * comprueba, no hay nada que anunciar y el operario se actualiza sin
 * enterarse de qué ha cambiado.
 *
 * Esto se fija en la versión que se está ejecutando AHORA y la compara con la
 * última que se enseñó. Así el aviso sale una vez por versión, siempre, y sin
 * depender de la red ni de pillar el momento.
 */
export const NovedadesTrasActualizar: React.FC = () => {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    try {
      const vista = localStorage.getItem(CLAVE);
      // Primera vez en este móvil: no se cuenta como actualización. Estrenar
      // la app con una lista de correcciones de versiones que no has vivido
      // no le dice nada a nadie.
      if (!vista) {
        localStorage.setItem(CLAVE, APP_VERSION);
        return;
      }
      if (vista !== APP_VERSION && APP_CHANGELOG.length > 0) setAbierto(true);
    } catch {
      // Sin almacén no se insiste: mejor callar que avisar en cada arranque.
    }
  }, []);

  const cerrar = () => {
    try { localStorage.setItem(CLAVE, APP_VERSION); } catch { /* da igual */ }
    setAbierto(false);
  };

  if (!abierto) return null;

  return (
    <div className="mx-3 rounded-xl bg-primary p-3 text-primary-foreground shadow-sm">
      <div className="flex items-start gap-2.5">
        <Sparkles size={20} className="mt-0.5 shrink-0 text-white" />
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-tight text-white">
            La app se ha actualizado a la v{parseFloat(APP_VERSION)}
          </p>
          <p className="text-sm text-white">Esto es lo que cambia:</p>
        </div>
        <button
          type="button" onClick={cerrar}
          className="shrink-0 rounded-md p-1 text-white"
          aria-label="Cerrar las novedades"
        >
          <X size={18} />
        </button>
      </div>

      <ul className="mt-2 space-y-1.5">
        {APP_CHANGELOG.map((n) => (
          <li key={n} className="flex gap-2 text-sm text-white">
            <span aria-hidden>•</span>
            <span className="min-w-0">{n}</span>
          </li>
        ))}
      </ul>

      <button
        type="button" onClick={cerrar}
        className="mt-3 w-full rounded-lg bg-white/95 py-2 font-bold text-primary active:scale-[0.99]"
      >
        Entendido
      </button>
    </div>
  );
};

export default NovedadesTrasActualizar;
