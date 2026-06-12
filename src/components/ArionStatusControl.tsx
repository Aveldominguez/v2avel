import React, { useCallback, useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
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

function formatHm(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Compact ARION control: a single badge showing last sync time.
 * Click opens the ARION settings dialog.
 */
export const ArionStatusControl: React.FC = () => {
  const { user } = useAuth();
  const { lastSync } = useArionSync();
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

  const hm = formatHm(lastSync);
  const hasData = (count ?? 0) > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono border transition-colors',
          hasData
            ? 'bg-[hsl(142,70%,38%)] text-white border-[hsl(142,70%,30%)] hover:bg-[hsl(142,70%,32%)]'
            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
        )}
        title="Configuración ARION"
      >
        <Wrench className="h-3.5 w-3.5 text-yellow-400" />
        {hm && <span>✓ {hm}</span>}
      </button>

      <ArionSettingsDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export default ArionStatusControl;
