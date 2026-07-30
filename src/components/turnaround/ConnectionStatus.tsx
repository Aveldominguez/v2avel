import React from 'react';
import { Wifi, WifiOff, Loader2, CloudOff, Check } from 'lucide-react';

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
    return (
      <div
        className="flex shrink-0 items-center gap-1.5 text-xs text-warning"
        title={`Sin conexión${pendingCount > 0 ? ` · ${pendingCount} pendiente(s)` : ''}`}
      >
        <WifiOff className="h-3.5 w-3.5 shrink-0" />
        <Label>Sin conexión</Label>
        {pendingCount > 0 && (
          <span className="shrink-0 bg-warning/20 text-warning px-1.5 py-0.5 rounded-full font-semibold">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div
        className="flex shrink-0 items-center gap-1.5 text-xs text-warning"
        title={`${pendingCount} cambio(s) pendiente(s) de sincronizar`}
      >
        <CloudOff className="h-3.5 w-3.5 shrink-0" />
        {/* El número se mantiene siempre visible: es un dato, no una etiqueta. */}
        <span className="shrink-0">{pendingCount}</span>
        <Label>pendiente{pendingCount > 1 ? 's' : ''}</Label>
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
