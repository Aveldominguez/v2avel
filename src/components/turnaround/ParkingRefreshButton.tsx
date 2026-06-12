import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useArionSync } from '@/hooks/useArionSync';

interface ParkingRefreshButtonProps {
  flightNumber: string;
  currentValue: string;
  onUpdate: (newValue: string) => void;
  onFlash: () => void;
}

function todayIso() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export const ParkingRefreshButton: React.FC<ParkingRefreshButtonProps> = ({
  flightNumber,
  currentValue,
  onUpdate,
  onFlash,
}) => {
  const { user } = useAuth();
  const { syncToday, syncing: syncingHook, hasCredentials } = useArionSync();
  const [busy, setBusy] = useState(false);

  if (!hasCredentials) return null;

  const isBusy = busy || syncingHook;

  const handleClick = async () => {
    const fn = flightNumber.trim().toUpperCase();
    if (!fn) {
      toast.error('Introduce primero el número de vuelo');
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      toast.error('Sin conexión — el parking no se puede actualizar ahora');
      return;
    }
    if (!user) return;

    setBusy(true);
    try {
      const res = await syncToday();
      if (!res) {
        toast.error('No se pudo actualizar el parking — comprueba la conexión');
        return;
      }
      const { data, error } = await supabase
        .from('scheduled_flights')
        .select('parking_code')
        .eq('user_id', user.id)
        .eq('flight_date', todayIso())
        .eq('flight_number', fn)
        .maybeSingle();
      if (error) {
        toast.error('No se pudo actualizar el parking — comprueba la conexión');
        return;
      }
      const newParking = (data?.parking_code || '').toString().trim().toUpperCase().slice(0, 4);
      if (newParking && newParking !== (currentValue || '').toUpperCase()) {
        onUpdate(newParking);
        onFlash();
        toast(`Parking actualizado: ${newParking}`);
      }
    } catch {
      toast.error('No se pudo actualizar el parking — comprueba la conexión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-6 w-6 rounded-full"
      onClick={handleClick}
      disabled={isBusy}
      title="Actualizar parking desde ARION"
    >
      {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
    </Button>
  );
};

export default ParkingRefreshButton;
