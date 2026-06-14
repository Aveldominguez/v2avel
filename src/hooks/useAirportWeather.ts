import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface AirportWeather {
  temp: number | null
  dewp: number | null
  windDir: number | null
  windVariable: boolean
  windSpeed: number
  windGusts: number | null
  visib: string | null
  qnh: number | null
  wxString: string | null
  clouds: Array<{ cover: string; base: number | null }>
  rawMetar: string
  obsTime: Date
}

export type WindAlert = 'PRECAUCION' | 'RESTRICCION' | 'SUSPENSION' | null

export function getWindAlert(speed: number, gusts: number | null): WindAlert {
  const max = Math.max(speed, gusts ?? 0)
  if (max >= 60) return 'SUSPENSION'
  if (max >= 40) return 'RESTRICCION'
  if (max >= 25) return 'PRECAUCION'
  return null
}

export function degToCompass(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO']
  return dirs[Math.round(deg / 22.5) % 16]
}

function translateWx(wx: string | null): string | null {
  if (!wx) return null
  return wx
    .replace(/\+/g, 'Fuerte ')
    .replace(/-/g, 'Ligera ')
    .replace(/TS/g, 'Tormenta ')
    .replace(/RA/g, 'Lluvia ')
    .replace(/DZ/g, 'Llovizna ')
    .replace(/SN/g, 'Nieve ')
    .replace(/FG/g, 'Niebla ')
    .replace(/BR/g, 'Neblina ')
    .replace(/HZ/g, 'Calima ')
    .replace(/SH/g, 'Chubasco ')
    .replace(/GR/g, 'Granizo ')
    .trim()
}

function coverLabel(cover: string): string {
  const map: Record<string, string> = {
    SKC: 'Despejado', CLR: 'Despejado',
    FEW: 'Pocas nubes', SCT: 'Nubes dispersas',
    BKN: 'Muy nublado', OVC: 'Cubierto',
    NSC: 'Sin nubes significativas',
  }
  return map[cover] ?? cover
}

export function useAirportWeather() {
  const [weather, setWeather] = useState<AirportWeather | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-metar')
      if (fnError) throw new Error(fnError.message)
      const m = Array.isArray(data) ? data[0] : null
      if (!m) throw new Error('Sin datos METAR')

      setWeather({
        temp: m.temp ?? null,
        dewp: m.dewp ?? null,
        windDir: typeof m.wdir === 'number' ? m.wdir : null,
        windVariable: m.wdir === 'VRB' || (m.wdir === 0 && (m.wspd ?? 0) < 3),
        windSpeed: m.wspd ?? 0,
        windGusts: m.wgst ?? null,
        visib: m.visib != null ? String(m.visib) : null,
        qnh: m.altim ? Math.round(m.altim) : null,
        wxString: translateWx(m.wxString ?? null),
        clouds: Array.isArray(m.clouds)
          ? m.clouds.map((c: { cover: string; base: number | null }) => ({ cover: coverLabel(c.cover), base: c.base ?? null }))
          : [],
        rawMetar: m.rawOb ?? '',
        obsTime: m.obsTime ? new Date(m.obsTime * 1000) : new Date(),
      })
    } catch {
      setError('No se pudo obtener el METAR de LEMD')
    } finally {
      setLoading(false)
    }
  }, [])

  const windAlert = weather ? getWindAlert(weather.windSpeed, weather.windGusts) : null

  return { weather, loading, error, refresh, windAlert }
}
