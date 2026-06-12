import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plane, RefreshCw, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useArionSync } from '@/hooks/useArionSync';
import { ArionSettingsDialog } from '@/components/ArionSettingsDialog';
import { cn } from '@/lib/utils';

function todayIso() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Compact ARION control: settings button + status chip for today's scheduled flights.
 */
export const ArionStatusControl: React.FC = () => {
  const { user } = useAuth();
  const { hasCredentials, syncing, syncToday, lastSync } = useArionSync();
  const [count, setCount] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const fetchCount = useCallback(async () => {
    if (!user) return;
    const { count: c, error } = await supabase
      .from('scheduled_flights')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('flight_date', todayIso());
    if (!error) setCount(c ?? 0);
  }, [user]);

  useEffect(() => { fetchCount(); }, [fetchCount, lastSync]);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await syncToday();
    fetchCount();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {syncing && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono bg-muted text-muted-foreground border border-border">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Sincronizando...
          </span>
        )}
        {!syncing && hasCredentials && count !== null && (
          count > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono bg-[hsl(142,70%,38%)] text-white border border-[hsl(142,70%,30%)]">
              <Plane className="h-3 w-3 mr-1" />
              {count} vuelos hoy
            </span>
          ) : (
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono',
              'bg-muted text-muted-foreground border border-border'
            )}>
              <Plane className="h-3 w-3 mr-1 opacity-50" />
              Sin datos
              <button
                type="button"
                onClick={handleRefresh}
                disabled={syncing}
                className="ml-1 inline-flex items-center justify-center h-4 w-4 hover:opacity-80 disabled:opacity-50"
                aria-label="Sincronizar"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </span>
          )
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setOpen(true)}
          title="Configuración ARION"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      <ArionSettingsDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export default ArionStatusControl;
