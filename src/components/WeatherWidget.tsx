import { useEffect, useState } from 'react'
import { useAirportWeather, degToCompass } from '@/hooks/useAirportWeather'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  RefreshCw, Thermometer, Wind, Eye, Gauge, Cloud,
  AlertTriangle, Ban, AlertOctagon, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ALERT_CONFIG = {
  PRECAUCION: {
    label: 'PRECAUCIÓN — Vientos fuertes (25–39 kt)',
    detail: 'Reducir operaciones no esenciales. Asegurar todo el GSE. Incrementar vigilancia en plataforma. Evitar movimientos innecesarios alrededor del avión.',
    bar: 'bg-yellow-500',
    border: 'border-yellow-500',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-700 dark:text-yellow-400',
    icon: AlertTriangle,
  },
  RESTRICCION: {
    label: 'RESTRICCIÓN OPERATIVA — Vientos muy fuertes (40–59 kt)',
    detail: 'Suspender actividades en rampa no seguras. Mantener despejada el área del avión. Reforzar anclajes GSE. Priorizar protección del personal.',
    bar: 'bg-orange-500',
    border: 'border-orange-500',
    bg: 'bg-orange-500/10',
    text: 'text-orange-700 dark:text-orange-400',
    icon: Ban,
  },
  SUSPENSION: {
    label: 'SUSPENSIÓN TOTAL — Detener toda actividad (≥ 60 kt)',
    detail: 'Detener INMEDIATAMENTE toda actividad en plataforma. Personal a refugio seguro. Sin movimiento de aeronave ni GSE hasta mejora de condiciones.',
    bar: 'bg-red-600',
    border: 'border-red-600',
    bg: 'bg-red-600/10',
    text: 'text-red-700 dark:text-red-400',
    icon: AlertOctagon,
  },
} as const

interface WeatherWidgetProps {
  compact?: boolean
}

export function WeatherWidget({ compact = false }: WeatherWidgetProps) {
  const { weather, loading, error, refresh, windAlert } = useAirportWeather()
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => { refresh() }, [refresh])

  const alert = windAlert ? ALERT_CONFIG[windAlert] : null
  const AlertIcon = alert?.icon
  const maxWind = weather ? Math.max(weather.windSpeed, weather.windGusts ?? 0) : 0
  const barPct = Math.min(100, (maxWind / 70) * 100)

  if (compact) {
    const direction = weather?.windVariable
      ? 'VRB'
      : weather?.windDir !== null && weather?.windDir !== undefined
        ? `${String(weather.windDir).padStart(3, '0')}°`
        : '—'
    const effectiveWind = weather ? Math.max(weather.windSpeed, weather.windGusts ?? 0) : 0
    const compactTone = windAlert === 'SUSPENSION'
      ? 'bg-[#d98289] text-[#35171b]'
      : windAlert === 'RESTRICCION'
        ? 'bg-[#e3b177] text-[#382514]'
        : windAlert === 'PRECAUCION'
          ? 'bg-[#e8d58b] text-[#302b17]'
          : 'bg-[#d7e6f3] text-[#284e73]'

    return (
      <div className="fixed inset-x-0 bottom-0 z-40 px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
        {showRaw && weather && (
          <div className="mx-auto mb-2 max-w-2xl rounded-xl border border-border bg-popover p-3 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold">{alert?.label ?? 'Condiciones normales'}</p>
                <p className="mt-1 text-xs text-popover-foreground/80">
                  {alert?.detail ?? 'Sin restricciones operativas por viento.'}
                </p>
              </div>
              <button className="text-xs text-muted-foreground" onClick={() => setShowRaw(false)}>Cerrar</button>
            </div>
            <pre className="mt-2 border-t border-border pt-2 text-[10px] font-mono whitespace-pre-wrap">
              {weather.rawMetar}
            </pre>
          </div>
        )}
        <div
          className={cn(
            'mx-auto flex min-h-12 w-full max-w-2xl items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-left shadow-lg transition active:scale-[0.99]',
            compactTone
          )}
        >
          <button
            type="button"
            onClick={() => setShowRaw(v => !v)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            aria-expanded={showRaw}
          >
            {AlertIcon ? <AlertIcon className="h-4 w-4 shrink-0" /> : <Wind className="h-4 w-4 shrink-0" />}
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold tracking-wide">
                METAR · LEMD {alert ? '· PRECAUCIÓN' : '· NORMAL'}
              </span>
              <span className="block truncate font-mono text-xs">
                {loading ? 'Actualizando…' : error ? 'METAR no disponible' : `${direction} · ${effectiveWind} kt`}
              </span>
            </span>
            {showRaw ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronUp className="h-4 w-4 shrink-0" />}
          </button>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-black/5"
            onClick={refresh}
            aria-label="Actualizar METAR"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alert && weather && AlertIcon && (
        <div className={cn('rounded-lg border-2 p-3', alert.border, alert.bg)}>
          <div className="flex items-start gap-2">
            <AlertIcon className={cn('h-5 w-5 shrink-0 mt-0.5', alert.text)} />
            <div className="flex-1 min-w-0">
              <p className={cn('font-bold text-sm', alert.text)}>{alert.label}</p>
              <p className="text-xs text-foreground/80 mt-1">{alert.detail}</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono mb-1">
              <span>0 kt</span><span>25</span><span>40</span><span>60 kt</span>
            </div>
            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
              <div className={cn('h-full transition-all', alert.bar)} style={{ width: `${barPct}%` }} />
            </div>
          </div>
        </div>
      )}

      <Card className="border-0 shadow-none bg-card rounded-none">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">METAR · LEMD (MAD)</span>
              {weather && (
                <span className="text-xs text-muted-foreground font-mono">
                  ULTIMA ACTUALIZACION {weather.obsTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} UTC
                </span>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refresh} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {!weather && !error && !loading && (
            <p className="text-sm text-muted-foreground">Pulsa ↻ para cargar el METAR</p>
          )}

          {weather && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-2 col-span-full sm:col-span-2 p-2 rounded-md bg-secondary/40">
                  <Wind className="h-5 w-5 shrink-0 mt-0.5 text-primary" />
                  <div className="flex-1">
                    <span className="font-bold">
                      {weather.windVariable
                        ? `VRB ${weather.windSpeed} kt = (${Math.round(weather.windSpeed * 1.852)} km/h)`
                        : weather.windDir !== null
                          ? `${String(weather.windDir).padStart(3,'0')}° (${degToCompass(weather.windDir)}) ${weather.windSpeed} kt = (${Math.round(weather.windSpeed * 1.852)} km/h)`
                          : `${weather.windSpeed} kt = (${Math.round(weather.windSpeed * 1.852)} km/h)`
                      }
                    </span>
                    {weather.windGusts && (
                      <span className="text-xs ml-2 font-semibold text-destructive">
                        ráfagas {weather.windGusts} kt ({Math.round(weather.windGusts * 1.852)} km/h)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">
                    {weather.temp !== null ? `${weather.temp}°C` : '—'}
                    {weather.dewp !== null && (
                      <span className="text-muted-foreground"> / {weather.dewp}°C rocío</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{weather.qnh !== null ? `${weather.qnh} hPa` : '—'}</span>
                </div>

                {weather.visib && (
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">
                      {weather.visib === '10+' ? '+10 km' : `${weather.visib} km`}
                    </span>
                  </div>
                )}

                {weather.wxString && (
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{weather.wxString}</span>
                  </div>
                )}

                {weather.clouds.length > 0 && (
                  <div className="col-span-full flex flex-wrap gap-2">
                    {weather.clouds.map((c, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded bg-secondary/60 font-mono">
                        {c.cover}{c.base !== null ? ` ${c.base} ft` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-border">
                <button
                  onClick={() => setShowRaw(v => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showRaw ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  METAR completo
                </button>
                {showRaw && (
                  <pre className="mt-2 p-2 rounded bg-muted text-xs font-mono whitespace-pre-wrap break-all">
                    {weather.rawMetar}
                  </pre>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
