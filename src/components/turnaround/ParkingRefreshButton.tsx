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
      // Sin filtro por user_id: la sincronización del sistema guarda las filas
      // con user_id NULL para que las vean todos los usuarios aprobados, así que
      // filtrar por usuario dejaba este botón sin resultados nunca.
      const { data, error } = await supabase
        .from('scheduled_flights')
        .select('parking_code, synced_at')
        .eq('flight_date', todayIso())
        .eq('flight_number', fn)
        .eq('movement_type', 'A')
        .order('synced_at', { ascending: false })
        .limit(1);
      if (error) {
        toast.error('No se pudo actualizar el parking — comprueba la conexión');
        return;
      }
      const newParking = (data?.[0]?.parking_code || '').toString().replace(/\s+/g, '').toUpperCase().slice(0, 6);
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
      className="aero-parking-refresh h-7 w-7 rounded-full"
      onClick={handleClick}
      disabled={isBusy}
      title="Actualizar parking desde ARION"
    >
      {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
    </Button>
  );
};

export default ParkingRefreshButton;
