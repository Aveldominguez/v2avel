import React, { useState, useEffect } from 'react';
import { RefreshCw, Loader2, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { toast } from 'sonner';

/**
 * Global in-app update banner. Sticky at the very top so it's visible
 * across every authenticated route. Page headers should offset by 40px
 * when an update is available (use `useAppUpdate().updateAvailable`).
 */
export const UpdateBanner: React.FC = () => {
  const { updating, updateAvailable, remoteVersion, remoteChangelog, applyUpdate } = useAppUpdate();
  const [showChangelog, setShowChangelog] = useState(false);

  useEffect(() => {
    if (updateAvailable) {
      const hasWestJet = remoteChangelog.some(
        (item) => item.toLowerCase().includes('westjet')
      );
      if (hasWestJet) {
        toast.info('Nueva aerolínea disponible', {
          description: 'WestJet (B737-800) ya está activa en la aplicación. Actualiza para usarla.',
          duration: 8000,
          icon: <Plane className="h-4 w-4" />,
        });
      }
    }
  }, [updateAvailable, remoteChangelog]);

  if (!updateAvailable) return null;

  return (
    <div className="sticky top-0 z-[60] bg-primary text-primary-foreground px-4 py-2 animate-in slide-in-from-top">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium flex-1 min-w-0">
          <RefreshCw className="h-4 w-4 flex-shrink-0" />
          <button
            className="text-left underline underline-offset-2 truncate"
            onClick={() => setShowChangelog((s) => !s)}
          >
            Nueva versión {remoteVersion ? `v${remoteVersion}` : ''} disponible
          </button>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 text-xs font-semibold flex-shrink-0"
          onClick={applyUpdate}
          disabled={updating}
        >
          {updating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Actualizar
        </Button>
      </div>
      {showChangelog && remoteChangelog.length > 0 && (
        <div className="mt-2 pt-2 border-t border-primary-foreground/20">
          <p className="text-xs font-semibold mb-1">Cambios incluidos:</p>
          <ul className="text-xs space-y-0.5 list-disc list-inside opacity-90">
            {remoteChangelog.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
