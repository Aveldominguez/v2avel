import React from 'react';
import { Wifi, Loader2, UploadCloud, Check } from 'lucide-react';
import { ConnectivityChip } from '@/components/ConnectivityChip';

interface ConnectionStatusProps {
  isOnline: boolean;
  syncing: boolean;
  pendingCount: number;
  lastSaved: Date | null;
}

/**
 * En la cabecera del formulario este indicador comparte fila con el botón
 * Guardar, que es la acción crítica. Las etiquetas de texto ("Sincronizando…",
 * "Sin conexión") medían ~110px y en móviles de ~412px empujaban el botón
 * fuera del margen del contenedor. Por eso el texto sólo se muestra a partir
 * de sm; en móvil quedan el icono y el color, que ya comunican el estado, más
 * el contador de pendientes, que sí es un dato y no puede perderse. El estado
 * completo sigue disponible en el title y para lectores de pantalla.
 */
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <span className="hidden sm:inline whitespace-nowrap">{children}</span>
    <span className="sr-only">{children}</span>
  </>
);

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isOnline,
  syncing,
  pendingCount,
  lastSaved,
}) => {
  if (syncing) {
    return (
      <div className="flex shrink-0 items-center gap-1.5 text-xs text-primary animate-pulse" title="Sincronizando…">
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        <Label>Sincronizando...</Label>
      </div>
    );
  }

  if (!isOnline) {
    // La píldora es la misma de las demás cabeceras: distingue quedarse sin
    // cobertura de no llegar al servidor, y al tocarla explica qué hacer.
    return (
      <div className="flex shrink-0 items-center gap-1.5 text-xs">
        <ConnectivityChip />
        {pendingCount > 0 && (
          <span
            className="shrink-0 rounded-full bg-warning/20 px-1.5 py-0.5 font-semibold text-warning"
            title={`${pendingCount} ${pendingCount === 1 ? 'cambio' : 'cambios'} por subir cuando vuelva la cobertura`}
          >
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (pendingCount > 0) {
    /*
     * Hay cobertura y queda algo por subir: se está enviando, no es un fallo.
     *
     * Antes esto salía con una nube TACHADA, que es el dibujo universal de
     * "sin conexión", y con buena cobertura no había quien lo entendiera. Una
     * nube con flecha hacia arriba dice lo que de verdad pasa: subiendo.
     */
    return (
      <div
        className="flex shrink-0 items-center gap-1.5 text-xs text-warning"
        title={`${pendingCount} ${pendingCount === 1 ? 'cambio' : 'cambios'} por subir al servidor. Se envían solos; no hace falta hacer nada.`}
      >
        <UploadCloud className="h-3.5 w-3.5 shrink-0" />
        <span className="shrink-0">{pendingCount}</span>
        <Label>por subir</Label>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="flex shrink-0 items-center gap-1 text-xs text-success" title="Guardado">
        <Check className="h-4 w-4 shrink-0" />
        <span className="sr-only">Guardado</span>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground" title="Conectado">
      <Wifi className="h-3.5 w-3.5 shrink-0" />
      <span className="sr-only">Conectado</span>
    </div>
  );
};
