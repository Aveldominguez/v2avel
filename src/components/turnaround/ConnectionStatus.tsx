import React from 'react';
import { Wifi, WifiOff, Loader2, Check } from 'lucide-react';

interface ConnectionStatusProps {
  isOnline: boolean;
  syncing: boolean;
  pendingCount: number;
  lastSaved: Date | null;
}

/**
 * El estado del guardado, en la cabecera, con un hueco de tamaño FIJO.
 *
 * Esto antes crecía: cuando no había servidor sacaba una píldora con texto y
 * un contador, y en pantallas de ~412px empujaba el botón de Guardar fuera
 * del margen. O sea que el botón desaparecía exactamente cuando más falta
 * hacía. Por eso ahora es siempre un icono y siempre mide lo mismo: pase lo
 * que pase con la red, la cabecera no se recoloca y Guardar no se mueve.
 *
 * El detalle —qué falla, cuántos cambios quedan por subir, qué hacer— vive en
 * la franja de avisos de debajo, donde hay ancho para contarlo. Aquí sólo
 * queda la señal de un vistazo, que es lo que se mira de reojo con las manos
 * ocupadas.
 *
 * Lo que se ve, en orden de importancia:
 *   girando  → guardando ahora mismo
 *   nube ✗   → no se llega al servidor (lo de abajo lo explica)
 *   check    → guardado
 *   wifi     → conectado, nada que contar
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isOnline,
  syncing,
  pendingCount,
  lastSaved,
}) => {
  const { Icono, color, titulo, girando } = (() => {
    if (syncing) {
      return { Icono: Loader2, color: 'text-primary', titulo: 'Guardando…', girando: true };
    }
    if (!isOnline) {
      return {
        Icono: WifiOff,
        color: 'text-warning',
        titulo: pendingCount > 0
          ? `Sin servidor. ${pendingCount} ${pendingCount === 1 ? 'cambio' : 'cambios'} por subir; se envían solos al volver.`
          : 'Sin servidor. Lo que escribas se guarda en el móvil.',
        girando: false,
      };
    }
    if (pendingCount > 0) {
      return {
        Icono: Loader2,
        color: 'text-warning',
        titulo: `${pendingCount} ${pendingCount === 1 ? 'cambio' : 'cambios'} subiendo. No hace falta hacer nada.`,
        girando: true,
      };
    }
    if (lastSaved) {
      return { Icono: Check, color: 'text-success', titulo: 'Guardado', girando: false };
    }
    return { Icono: Wifi, color: 'text-muted-foreground', titulo: 'Conectado', girando: false };
  })();

  return (
    // w-5 fijo y shrink-0: este hueco no cambia de tamaño nunca, que es todo
    // el sentido de este componente.
    <div
      className={`flex h-9 w-5 shrink-0 items-center justify-center ${color}`}
      title={titulo}
    >
      <Icono className={`h-4 w-4 shrink-0 ${girando ? 'animate-spin' : ''}`} />
      <span className="sr-only">{titulo}</span>
    </div>
  );
};
