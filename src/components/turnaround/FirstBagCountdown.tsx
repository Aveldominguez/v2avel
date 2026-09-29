import { useEffect, useRef, useState } from 'react';
import { Luggage, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeFirstBagAlert, FIRST_BAG_DEADLINE_MIN } from '@/utils/firstBagAlert';
import { formatCountdown } from '@/utils/cargoDoorAlert';
import { playAlert } from '@/lib/alertSound';

interface FirstBagCountdownProps {
  unloadingStart: string | null | undefined;
  firstBag: string | null | undefined;
  soloSalida?: boolean;
  flightDate?: Date | null;
}

/**
 * Cuenta atrás para enviar la primera maleta, bajo el inicio de descarga.
 *
 * La norma es enviarlas a los 10 minutos de marcar el inicio. Va aquí y no
 * arriba a propósito: está junto al dato que la origina, y arriba competiría
 * con el aviso de cierre de bodegas.
 */
export const FirstBagCountdown: React.FC<FirstBagCountdownProps> = ({
  unloadingStart, firstBag, soloSalida, flightDate,
}) => {
  const [now, setNow] = useState(() => new Date());
  const ultimoPitido = useRef<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const alerta = computeFirstBagAlert({ unloadingStart, firstBag, soloSalida, flightDate, now });

  useEffect(() => {
    if (!alerta.beep) return;
    // Cada pitido suena una sola vez, aunque el tic pase varias veces por él.
    if (ultimoPitido.current === alerta.beep) return;
    ultimoPitido.current = alerta.beep;
    playAlert(alerta.beep === 'headsUp' ? 'headsUp' : 'urgent');
  }, [alerta.beep]);

  if (alerta.level === 'off') return null;

  if (alerta.level === 'done') {
    const m = alerta.elapsedMinutes;
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold',
          alerta.onTime
            ? 'border-emerald-600/50 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
            : 'border-red-600/50 bg-red-600/10 text-red-600 dark:text-red-400',
        )}
      >
        <Check size={13} className="shrink-0" />
        {m === null ? '1ª maleta enviada' : `1ª maleta a los ${m} min`}
      </div>
    );
  }

  const estilo =
    alerta.level === 'late' ? 'border-red-600 bg-red-600/15 text-red-600 dark:text-red-400 animate-pulse'
    : alerta.level === 'soon' ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400'
    : 'border-emerald-600/50 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400';

  return (
    <div
      className={cn('flex items-center gap-1.5 rounded-md border px-2 py-1 font-semibold', estilo)}
      role="status"
    >
      <Luggage size={13} className="shrink-0" />
      <span className="text-[11px] uppercase tracking-wide">
        {alerta.level === 'late' ? 'Fuera de norma' : `1ª maleta H+${FIRST_BAG_DEADLINE_MIN}`}
      </span>
      <span className="ml-auto font-mono text-sm tabular-nums">
        {formatCountdown(alerta.secondsToDeadline)}
      </span>
    </div>
  );
};
