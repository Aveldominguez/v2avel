import React, { useEffect, useRef, useState } from 'react';
import { DoorClosed, Volume2, VolumeX, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  computeDoorAlert, formatCountdown, DOOR_DEADLINE_MIN,
  type DoorAlertLevel,
} from '@/utils/cargoDoorAlert';
import { isAlertMuted, setAlertMuted, playAlert, type AlertTone } from '@/lib/alertSound';

interface CargoDoorAlertProps {
  aircraftModel: string | null | undefined;
  departureTime: string | null | undefined;
  /** Calzos de llegada: hasta que no están puestos no se avisa de nada. */
  chocksOnArrival?: string | null;
  /** Escala programada por la aerolínea para el modelo, en minutos. */
  turnaroundMinutes?: number | null;
  cargoDoorsClosed: string | null | undefined;
  soloLlegada?: boolean;
  soloSalida?: boolean;
  /** Fecha de la escala: sólo se avisa en las de hoy. */
  flightDate?: Date | null;
  /** Registra el cierre con la hora actual desde el propio aviso. */
  onCloseDoors: () => void;
}

const ESTILOS: Record<Exclude<DoorAlertLevel, 'off'> | 'doneLate', string> = {
  headsUp: 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400',
  urgent: 'border-orange-500 bg-orange-500/20 text-orange-600 dark:text-orange-400',
  late: 'border-red-600 bg-red-600/20 text-red-600 dark:text-red-400 animate-pulse',
  done: 'border-emerald-600 bg-emerald-600/15 text-emerald-600 dark:text-emerald-400',
  // Cerrado, pero fuera de normativa. En verde se leía como "todo correcto" de
  // un vistazo y era justo lo contrario. Sin parpadeo: ya no hay nada que
  // corregir, sólo constancia de que se salió del límite.
  doneLate: 'border-red-600 bg-red-600/20 text-red-600 dark:text-red-400',
};

const TITULOS: Record<Exclude<DoorAlertLevel, 'off' | 'done'>, string> = {
  headsUp: 'VE CERRANDO BODEGAS',
  urgent: 'CIERRA BODEGAS YA',
  late: 'FUERA DE NORMATIVA',
};

/**
 * Aviso en vivo del cierre de puertas de bodega (normativa H-5 en Narrow Body).
 * Sólo aparece cuando toca: si no aplica, no ocupa sitio en la pantalla.
 */
export const CargoDoorAlert: React.FC<CargoDoorAlertProps> = ({
  aircraftModel, departureTime, chocksOnArrival, turnaroundMinutes,
  cargoDoorsClosed, soloLlegada, soloSalida, flightDate, onCloseDoors,
}) => {
  const [now, setNow] = useState(() => new Date());
  const [muted, setMuted] = useState(isAlertMuted);
  // Minuto del último pitido: evita repetirlo en cada tic de un mismo minuto.
  const lastBeepRef = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const alerta = computeDoorAlert({
    aircraftModel, departureTime, chocksOnArrival, turnaroundMinutes,
    cargoDoorsClosed, soloLlegada, soloSalida, flightDate, now,
  });

  useEffect(() => {
    if (!alerta.shouldBeep || alerta.level === 'off' || alerta.level === 'done') return;
    if (lastBeepRef.current === alerta.minuteMark) return;
    lastBeepRef.current = alerta.minuteMark;
    playAlert(alerta.level as AlertTone);
  }, [alerta.shouldBeep, alerta.minuteMark, alerta.level]);

  if (alerta.level === 'off') return null;

  const toggleMute = () => {
    const nuevo = !muted;
    setMuted(nuevo);
    setAlertMuted(nuevo);
  };

  if (alerta.level === 'done') {
    const m = alerta.marginMinutes;
    const fueraDeNormativa = m !== null && m < 0;
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border-2 px-3 py-2',
          fueraDeNormativa ? ESTILOS.doneLate : ESTILOS.done,
        )}
      >
        {fueraDeNormativa
          ? <AlertTriangle size={18} className="shrink-0" />
          : <Check size={18} className="shrink-0" />}
        <span className="font-mono text-sm font-bold uppercase tracking-wide">
          Bodegas cerradas
          {m !== null && (m >= 0 ? ` · ${m} min de margen` : ` · ${Math.abs(m)} min tarde`)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn('rounded-lg border-2 px-3 py-2', ESTILOS[alerta.level])}
      role="alert"
      aria-live="assertive"
    >
      {/* Título en su propia línea: en 375 px partía en dos y aplastaba el resto. */}
      <div className="flex items-center gap-2">
        <DoorClosed size={18} className="shrink-0" />
        <p className="min-w-0 flex-1 truncate font-mono text-xs font-black uppercase tracking-wide">
          {TITULOS[alerta.level]}
        </p>
        <button
          type="button"
          onClick={toggleMute}
          className="shrink-0 rounded-full p-1 opacity-70 hover:opacity-100"
          aria-label={muted ? 'Activar sonido del aviso' : 'Silenciar aviso'}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* Lo que hay que leer de un vistazo desde debajo del avión. */}
      <div className="flex items-baseline justify-center gap-2 py-0.5">
        <span className="font-mono text-5xl font-black leading-none tabular-nums">
          {formatCountdown(alerta.secondsToDeadline)}
        </span>
        <span className="text-[11px] font-semibold uppercase opacity-80">
          {alerta.level === 'late' ? `pasado H-${DOOR_DEADLINE_MIN}` : `para H-${DOOR_DEADLINE_MIN}`}
        </span>
      </div>

      {/* De qué salida cuelga el límite: si el avión llegó tarde no es la ETD,
          y sin decirlo el operador no entiende por qué le pide cerrar a esa
          hora. */}
      {alerta.departureLabel && (
        <p className="text-center text-[11px] font-mono opacity-80">
          salida {alerta.departureLabel}
          {alerta.basedOnGroundTime && ' · calzos + escala'}
        </p>
      )}

      <button
        type="button"
        onClick={onCloseDoors}
        className="mt-1 w-full rounded-md border-2 border-current bg-background/60 py-2 font-mono text-sm font-bold uppercase tracking-wide active:scale-[0.98]"
      >
        Marcar puertas cerradas
      </button>
    </div>
  );
};
