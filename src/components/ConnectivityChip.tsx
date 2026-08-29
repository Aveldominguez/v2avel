import { useState } from 'react';
import { WifiOff, ServerCrash } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { connectivityMessage } from '@/utils/connectivityState';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Estado de la conexión, en pequeño y dentro de la cabecera.
 *
 * Sustituye a la franja fija que ocupaba todo el ancho: se comía la cabecera
 * de la escala y tapaba el botón de Guardar justo cuando más falta hacía.
 * Aquí no roba sitio a nadie y cuando todo va bien no se pinta.
 */
export const ConnectivityChip: React.FC<{ className?: string }> = ({ className }) => {
  const { connectivity } = useOnlineStatus();
  const [abierto, setAbierto] = useState(false);
  const msg = connectivityMessage(connectivity);
  if (!msg) return null; // Conectado: no hay nada que contar.

  const Icono = connectivity === 'offline' ? WifiOff : ServerCrash;
  const corto = connectivity === 'offline' ? 'Sin cobertura' : 'Sin servidor';

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title={`${msg.title} — tocar para más detalle`}
        aria-label={msg.title}
        className={cn(
          'flex shrink-0 items-center gap-1 rounded-full border border-warning/40 bg-warning/15',
          'px-2 py-0.5 text-xs font-semibold text-warning active:scale-95',
          className,
        )}
      >
        <Icono className="h-3.5 w-3.5 shrink-0" />
        {/* En pantallas estrechas queda sólo el icono: la cabecera va justa. */}
        <span className="hidden min-[420px]:inline whitespace-nowrap">{corto}</span>
      </button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icono className="h-5 w-5 text-warning" />
              {msg.title}
            </DialogTitle>
            <DialogDescription className="text-left">{msg.detail}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};
