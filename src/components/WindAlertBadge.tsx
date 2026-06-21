import React, { useState, useEffect } from 'react';
import { Wind, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useMetar, ALERT_CONFIG, type WindAlertLevel } from '@/hooks/useMetar';

export const WindAlertBadge: React.FC = () => {
  const { windData, alertLevel } = useMetar();
  const [open, setOpen] = useState(false);
  const [dismissedLevel, setDismissedLevel] = useState<WindAlertLevel>(null);

  // Re-show if level worsens
  useEffect(() => {
    if (alertLevel && alertLevel !== dismissedLevel) {
      setDismissedLevel(null);
      if (alertLevel === 'suspension') setOpen(true);
    }
  }, [alertLevel]);

  if (!alertLevel || alertLevel === dismissedLevel || !windData) return null;

  const cfg = ALERT_CONFIG[alertLevel];
  const effective = Math.max(windData.speed, windData.gust ?? 0);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[60]"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg font-semibold text-xs ${cfg.color} ${cfg.textColor} transition-all`}
        >
          <Wind className="h-3.5 w-3.5" />
          <span>{effective}kt</span>
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>

        {open && (
          <div className="w-[min(90vw,360px)] rounded-lg bg-background border shadow-2xl p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${cfg.color} ${cfg.textColor}`}>
                  {cfg.label}
                </div>
                <div className="text-sm mt-1.5 font-mono">
                  {windData.direction.toString().padStart(3, '0')}°/{windData.speed}kt
                  {windData.gust ? ` ráfagas ${windData.gust}kt` : ''}
                </div>
              </div>
              <button
                onClick={() => setDismissedLevel(alertLevel)}
                className="opacity-70 hover:opacity-100"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="space-y-1.5 mt-3">
              {cfg.actions.map((a, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="opacity-60">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>

            <div className="text-[10px] text-muted-foreground mt-3 pt-2 border-t font-mono">
              METAR LEMD ·{' '}
              {windData.updatedAt.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
