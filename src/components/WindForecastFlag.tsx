import React, { useEffect, useState } from 'react';
import { CalendarClock, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useWindForecast, type WindAlertLevel } from '@/hooks/useWindForecast';
import { cn } from '@/lib/utils';

const LEVEL_STYLE: Record<Exclude<WindAlertLevel, null>, { label: string; tone: string; border: string }> = {
  PRECAUCION: { label: 'PRECAUCIÓN', tone: 'bg-yellow-500 text-yellow-950', border: 'border-yellow-500/50' },
  RESTRICCION: { label: 'RESTRICCIÓN', tone: 'bg-orange-500 text-white', border: 'border-orange-500/50' },
  SUSPENSION: { label: 'SUSPENSIÓN', tone: 'bg-red-600 text-white', border: 'border-red-600/50' },
};

const fmtHour = (d: Date) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

/**
 * Banderín de PREVISIÓN de viento (TAF), distinto del indicador de METAR en
 * vivo — a propósito, para no confundir "viento fuerte ahora" con "viento
 * fuerte previsto más tarde". Solo se muestra si hay alguna franja de hoy
 * con nivel de alerta; si no hay nada previsto, no renderiza nada.
 */
interface WindForecastFlagProps {
  className?: string;
  /**
   * 'pill'   — banderín compacto, para meterlo en una fila junto a otros controles.
   * 'banner' — franja a todo el ancho con la misma estructura de dos líneas que
   *            la barra del METAR. Es el formato de la Home: la previsión del día
   *            es información operativa importante y en formato pastilla pasaba
   *            desapercibida al lado del widget de METAR.
   */
  variant?: 'pill' | 'banner';
}

export const WindForecastFlag: React.FC<WindForecastFlagProps> = ({ className, variant = 'pill' }) => {
  const { forecast, refresh } = useWindForecast();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30 * 60 * 1000); // TAF se actualiza cada ~6h; 30 min es de sobra
    return () => clearInterval(id);
  }, [refresh]);

  if (!forecast?.worstToday) return null;

  const { worstToday, periodsToday } = forecast;
  const style = LEVEL_STYLE[worstToday.level!];

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setOpen(false)} />
      )}
      <div className={cn('relative z-[70]', variant === 'banner' ? 'block' : 'inline-flex', className)}>
        {variant === 'banner' ? (
          <button
            onClick={() => setOpen((o) => !o)}
            className={`flex min-h-12 w-full items-center gap-2 rounded-xl border-2 border-current/30 px-3 py-2 text-left shadow-sm font-semibold ${style.tone} transition-all active:scale-[0.99]`}
            aria-expanded={open}
            aria-label={`Previsión de viento: ${style.label} entre ${fmtHour(worstToday.from)} y ${fmtHour(worstToday.to)}`}
          >
            <CalendarClock className="h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold tracking-wide">
                PREVISIÓN TAF · LEMD · {style.label}
              </span>
              <span className="block truncate font-mono text-xs">
                {fmtHour(worstToday.from)}–{fmtHour(worstToday.to)} · {worstToday.speed}
                {worstToday.gust ? `G${worstToday.gust}` : ''} kt
              </span>
            </span>
            {open
              ? <ChevronDown className="h-4 w-4 shrink-0" />
              : <ChevronUp className="h-4 w-4 shrink-0" />}
          </button>
        ) : (
          <button
            onClick={() => setOpen((o) => !o)}
            className={`flex h-10 items-center gap-1.5 rounded-lg border-2 border-current/30 px-2.5 shadow-sm font-semibold text-xs ${style.tone} transition-all`}
            aria-label={`Previsión de viento: ${style.label} entre ${fmtHour(worstToday.from)} y ${fmtHour(worstToday.to)}`}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">PREVISIÓN</span>
            <span>{fmtHour(worstToday.from)}–{fmtHour(worstToday.to)}</span>
          </button>
        )}

        {open && (
          <div className="fixed left-1/2 top-24 z-[80] w-[min(90vw,380px)] -translate-x-1/2 rounded-xl border bg-popover p-4 text-popover-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${style.tone}`}>
                  PREVISIÓN {style.label} · LEMD
                </div>
                <p className="text-xs mt-1.5 text-muted-foreground">
                  Basado en la TAF (previsión oficial), no en el estado actual.
                  Consulta el METAR en vivo para las condiciones de ahora mismo.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="opacity-70 hover:opacity-100" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="space-y-1.5 mt-3">
              {periodsToday.map((p, i) => {
                const s = LEVEL_STYLE[p.level!];
                return (
                  <li key={i} className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm ${s.border}`}>
                    <span className="font-mono">{fmtHour(p.from)}–{fmtHour(p.to)}</span>
                    <span className="text-xs text-muted-foreground">{p.changeType}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${s.tone}`}>
                      {p.speed}{p.gust ? `G${p.gust}` : ''} kt
                    </span>
                  </li>
                );
              })}
            </ul>

            {forecast.issueTime && (
              <div className="text-[10px] text-muted-foreground mt-3 pt-2 border-t font-mono">
                TAF LEMD emitida {forecast.issueTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} UTC
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
