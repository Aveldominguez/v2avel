import React from 'react';
import { Wifi, WifiOff, Loader2, CloudOff, Check } from 'lucide-react';

interface ConnectionStatusProps {
  isOnline: boolean;
  syncing: boolean;
  pendingCount: number;
  lastSaved: Date | null;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isOnline,
  syncing,
  pendingCount,
  lastSaved,
}) => {
  if (syncing) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-primary animate-pulse">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Sincronizando...</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-warning">
        <WifiOff className="h-3.5 w-3.5" />
        <span>Sin conexión</span>
        {pendingCount > 0 && (
          <span className="bg-warning/20 text-warning px-1.5 py-0.5 rounded-full font-semibold">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-warning">
        <CloudOff className="h-3.5 w-3.5" />
        <span>{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="flex items-center gap-1 text-xs text-success" title="Guardado">
        <Check className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Wifi className="h-3.5 w-3.5" />
    </div>
  );
};
