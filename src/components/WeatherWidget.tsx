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

export function WeatherWidget() {
  const { weather, loading, error, refresh, windAlert } = useAirportWeather()
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => { refresh() }, [refresh])

  const alert = windAlert ? ALERT_CONFIG[windAlert] : null
  const AlertIcon = alert?.icon
  const maxWind = weather ? Math.max(weather.windSpeed, weather.windGusts ?? 0) : 0
  const barPct = Math.min(100, (maxWind / 70) * 100)

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

      <Card className="card-operational">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">METAR · LEMD</span>
              {weather && (
                <span className="text-xs text-muted-foreground font-mono">
                  {weather.obsTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} UTC
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
                    <div className="font-mono font-bold text-base">
                      {weather.windVariable
                        ? `VRB ${weather.windSpeed} kt`
                        : weather.windDir !== null
                          ? `${String(weather.windDir).padStart(3,'0')}° (${degToCompass(weather.windDir)}) ${weather.windSpeed} kt`
                          : `${weather.windSpeed} kt`}
                    </div>
                    {weather.windGusts && (
                      <div className="text-sm font-bold text-destructive">
                        ráfagas {weather.windGusts} kt
                      </div>
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
