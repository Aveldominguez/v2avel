import React, { useState, useEffect } from 'react';
import { Wind, X } from 'lucide-react';
import { useMetar, ALERT_CONFIG, type WindAlertLevel } from '@/hooks/useMetar';

export const WindAlertBadge: React.FC = () => {
  const { windData, alertLevel, loading } = useMetar();
  const [open, setOpen] = useState(false);
  const [dismissedLevel, setDismissedLevel] = useState<WindAlertLevel>(null);

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
          className={`wind-alert-flag wind-alert-${alertLevel ?? 'normal'} flex h-10 min-w-10 items-center justify-center gap-1 rounded-lg border-2 border-current/30 px-2 shadow-sm font-semibold text-xs ${tone} transition-all`}
          aria-label={cfg && !isDismissed ? `Alerta de viento: ${cfg.label}` : 'Estado del viento: normal'}
        >
          <Wind className="h-3.5 w-3.5" />
          {effective !== null && <span className="hidden sm:inline">{effective}kt</span>}
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
          </div>
        )}
      </div>
    </>
  );
};
