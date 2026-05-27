import { useState, useEffect } from 'react';
import { Wrench, Fuel } from 'lucide-react';
import type { EquipmentUnitFull } from '@/types/equipment';
import PriorityBadge from './PriorityBadge';
import ChargingButton from './ChargingButton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ChargingTimer = ({ since }: { since: string | null }) => {
  const [minutes, setMinutes] = useState(0);
  useEffect(() => {
    if (!since) return;
    const start = new Date(since).getTime();
    const tick = () => setMinutes(Math.floor((Date.now() - start) / 60000));
    tick();
    const i = setInterval(tick, 30000);
    return () => clearInterval(i);
  }, [since]);
  if (!since) return null;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  const display = h > 0 ? `${h}h ${m > 0 ? `${m}min` : ''}` : `${minutes}min`;
  return <span className="rounded bg-success/15 px-1.5 py-0.5 font-mono text-xs font-semibold text-success">{display}</span>;
};

interface Props {
  unit: EquipmentUnitFull;
  rank: number | null;
  isAutonomyMode?: boolean;
  onToggleCharging: () => void;
  onUpdateParking: (val: string) => void;
  onUpdateBattery: (val: number | null) => void;
  onToggleBroken: () => void;
}

const EquipmentRow = ({
  unit, rank, isAutonomyMode = false,
  onToggleCharging, onUpdateParking, onUpdateBattery, onToggleBroken,
}: Props) => {
  const state = unit.state;
  const batteryLevel = state?.battery_level ?? null;
  const isCharging = state?.is_charging ?? false;
  const isBroken = state?.is_broken ?? false;
  const parking = state?.parking ?? '';

  const [batteryInput, setBatteryInput] = useState(batteryLevel !== null ? String(batteryLevel) : '');
  useEffect(() => { setBatteryInput(batteryLevel !== null ? String(batteryLevel) : ''); }, [batteryLevel]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showBrokenConfirm, setShowBrokenConfirm] = useState(false);

  const handleBatteryChange = (val: string) => {
    if (isAutonomyMode) {
      const clean = val.replace(/^KM\s*/i, '').replace(/\D/g, '');
      if (clean === '') { setBatteryInput(''); onUpdateBattery(null); return; }
      const n = Math.min(99999, parseInt(clean.slice(0, 5)));
      setBatteryInput(String(n)); onUpdateBattery(n); return;
    }
    const clean = val.replace(/\D/g, '');
    if (clean === '') { setBatteryInput(''); onUpdateBattery(null); return; }
    const n = Math.min(100, parseInt(clean));
    setBatteryInput(String(n)); onUpdateBattery(n);
  };

  const handleChargingClick = () => {
    if (unit.fuel_type === 'fuel') {
      setBatteryInput('100'); onUpdateBattery(100); return;
    }
    if (!isCharging) setShowConfirm(true); else onToggleCharging();
  };

  return (
    <>
      <tr className={`border-b border-border ${isBroken ? 'opacity-60' : ''}`}>
        <td className="px-1 py-2">
          <div className="flex items-center gap-1">
            <PriorityBadge rank={rank} batteryLevel={batteryLevel} />
            <ChargingButton isCharging={isCharging} isFuel={unit.fuel_type === 'fuel'} onToggle={handleChargingClick} />
            <span className="font-mono text-sm font-semibold">{unit.code}</span>
          </div>
        </td>
        <td className="px-1 py-2">
          <input
            type="text"
            value={parking}
            onChange={(e) => onUpdateParking(e.target.value.toUpperCase())}
            placeholder="—"
            className="h-11 w-20 rounded-sm border border-border bg-background px-1 font-mono text-sm uppercase focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </td>
        <td className="px-1 py-2">
          <div className="flex items-center gap-1">
            <div className="flex-1">
              {isBroken ? (
                <span className="block h-11 leading-[2.75rem] text-center text-sm font-semibold italic text-destructive">EN TALLER</span>
              ) : isCharging ? (
                <div className="flex h-11 items-center justify-center gap-2">
                  <span className="text-sm italic text-success">Cargando</span>
                  <ChargingTimer since={state?.charging_since ?? null} />
                </div>
              ) : (
                <input
                  type="text" inputMode="numeric" pattern="[0-9]*"
                  value={isAutonomyMode && batteryInput ? `KM ${batteryInput}` : batteryInput}
                  onChange={(e) => handleBatteryChange(e.target.value)}
                  placeholder={isAutonomyMode ? 'KM —' : '—'}
                  className="h-11 w-full rounded-sm border border-border bg-background px-2 text-center font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              )}
            </div>
            <button
              onClick={() => setShowBrokenConfirm(true)}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${isBroken ? 'bg-destructive text-destructive-foreground' : 'text-muted-foreground hover:text-destructive'}`}
              aria-label={isBroken ? 'Marcar operativo' : 'Marcar averiado'}
            >
              <Wrench size={16} />
            </button>
          </div>
        </td>
      </tr>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Poner a cargar {unit.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              {batteryLevel !== null
                ? `El equipo tiene actualmente ${batteryLevel}% de batería. Al activar la carga se reemplazará este valor por "Cargando".`
                : 'Al activar la carga, el campo de batería mostrará "Cargando".'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onToggleCharging}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBrokenConfirm} onOpenChange={setShowBrokenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isBroken ? `¿Marcar ${unit.code} como operativo?` : `¿Enviar ${unit.code} a taller?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {isBroken ? 'El equipo volverá a estar disponible.' : 'El equipo quedará marcado como averiado.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onToggleBroken(); setShowBrokenConfirm(false); }}
              className={isBroken ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
            >Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
export { Fuel };
export default EquipmentRow;
