import React, { useState, useEffect } from 'react';
import { Wind, X, CalendarClock } from 'lucide-react';
import { useMetar, ALERT_CONFIG, type WindAlertLevel } from '@/hooks/useMetar';
import { useWindForecast } from '@/hooks/useWindForecast';

const FORECAST_TONE: Record<'PRECAUCION' | 'RESTRICCION' | 'SUSPENSION', string> = {
  PRECAUCION: 'bg-yellow-500 text-yellow-950',
  RESTRICCION: 'bg-orange-500 text-white',
  SUSPENSION: 'bg-red-600 text-white',
};

const fmtHour = (d: Date) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

export const WindAlertBadge: React.FC = () => {
  const { windData, alertLevel, loading } = useMetar();
  const { forecast, refresh: refreshForecast } = useWindForecast();
  const [open, setOpen] = useState(false);
  const [dismissedLevel, setDismissedLevel] = useState<WindAlertLevel>(null);

  useEffect(() => {
    refreshForecast();
    const id = setInterval(refreshForecast, 30 * 60 * 1000); // TAF se actualiza cada ~6h; 30 min es de sobra
    return () => clearInterval(id);
  }, [refreshForecast]);

  // Re-show if level worsens
  useEffect(() => {
    if (alertLevel && alertLevel !== dismissedLevel) {
      setDismissedLevel(null);
      if (alertLevel === 'suspension') setOpen(true);
    }
  }, [alertLevel, dismissedLevel]);

  const cfg = alertLevel ? ALERT_CONFIG[alertLevel] : null;
  const effective = windData ? Math.max(windData.speed, windData.gust ?? 0) : null;
  const isDismissed = Boolean(alertLevel && alertLevel === dismissedLevel);
  const tone = cfg && !isDismissed ? `${cfg.color} ${cfg.textColor}` : 'bg-primary text-primary-foreground';

  const worstForecast = forecast?.worstToday ?? null;
  const forecastTone = worstForecast ? FORECAST_TONE[worstForecast.level!] : null;

  // El botón pinta el METAR en vivo si hay alerta actual; si no, pinta la
  // previsión TAF. Antes la previsión sólo se veía como un punto diminuto en
  // la esquina, pese a ser información operativa importante.
  const liveActive = Boolean(cfg && !isDismissed);
  const badgeTone = liveActive ? tone : (forecastTone ?? 'bg-primary text-primary-foreground');
  const effectiveLevel: WindAlertLevel = liveActive
    ? alertLevel
    : (worstForecast ? (worstForecast.level!.toLowerCase() as WindAlertLevel) : null);

  const badgeLabel = liveActive
    ? `Alerta de viento: ${cfg!.label}`
    : worstForecast
      ? `Previsión de viento: ${worstForecast.level} entre ${fmtHour(worstForecast.from)} y ${fmtHour(worstForecast.to)}`
      : 'Estado del viento: normal';

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[60]"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="relative z-[70]">
        <button
          onClick={() => setOpen((o) => !o)}
          className={`wind-alert-flag wind-alert-${effectiveLevel ?? 'normal'} ${effectiveLevel ? 'wind-alert-pulse' : ''} relative flex h-10 min-w-10 items-center justify-center gap-1 rounded-lg border-2 border-current/30 px-2 shadow-sm font-semibold text-xs ${badgeTone} transition-all`}
          aria-label={badgeLabel}
        >
          <Wind className="h-3.5 w-3.5" />
          {effective !== null && <span className="hidden sm:inline">{effective}kt</span>}
          {/* Punto de aviso: sólo cuando el fondo ya está mostrando la alerta
              del METAR en vivo, para no perder el dato de que además hay
              previsión. Si no hay alerta en vivo, la previsión se ve en el
              propio fondo del botón y el punto sobra. */}
          {worstForecast && liveActive && (
            <span
              className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${forecastTone}`}
              aria-hidden="true"
            />
          )}
        </button>

        {open && (
          <div className="fixed left-1/2 top-24 z-[80] w-[min(90vw,360px)] -translate-x-1/2 rounded-xl border bg-popover p-4 text-popover-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${tone}`}>
                  {loading ? 'ACTUALIZANDO METAR' : cfg && !isDismissed ? cfg.label : 'VIENTO NORMAL'}
                </div>
                {windData && (
                  <div className="text-sm mt-1.5 font-mono">
                    {windData.direction.toString().padStart(3, '0')}°/{windData.speed}kt
                    {windData.gust ? ` ráfagas ${windData.gust}kt` : ''}
                  </div>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="opacity-70 hover:opacity-100"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {cfg && !isDismissed ? (
              <>
                <ul className="space-y-1.5 mt-3">
                  {cfg.actions.map((action) => (
                    <li key={action} className="flex gap-2 text-sm">
                      <span className="opacity-60">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    setDismissedLevel(alertLevel);
                    setOpen(false);
                  }}
                  className="mt-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Marcar como leída
                </button>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Sin restricciones operativas por viento.</p>
            )}

            {windData && (
              <div className="text-[10px] text-muted-foreground mt-3 pt-2 border-t font-mono">
                METAR LEMD ·{' '}
                {windData.updatedAt.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}

            {/* Previsión (TAF): separado del METAR en vivo a propósito — no es
                el estado actual, es lo que se espera más tarde hoy. */}
            {forecast && forecast.periodsToday.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center gap-1.5 mb-2">
                  <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground">PREVISIÓN DE HOY (TAF)</span>
                </div>
                <ul className="space-y-1.5">
                  {forecast.periodsToday.map((p, i) => {
                    const t = FORECAST_TONE[p.level!];
                    return (
                      <li key={i} className={`flex items-center justify-between gap-2 rounded-md border border-current/20 px-2 py-1 text-xs ${t}`}>
                        <span className="font-mono">{fmtHour(p.from)}–{fmtHour(p.to)}</span>
                        <span className="font-bold">{p.speed}{p.gust ? `G${p.gust}` : ''} kt</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Previsión oficial, no el estado actual — puede cambiar.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
