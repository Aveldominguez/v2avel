// Lógica pura de interpretación de la TAF (previsión aeronáutica) — sin
// dependencias de React ni Supabase, para poder testearla de forma aislada.

export type WindAlertLevel = 'PRECAUCION' | 'RESTRICCION' | 'SUSPENSION' | null

// Mismos umbrales que el METAR en vivo (useAirportWeather.ts / useMetar.ts),
// para que "ahora" y "previsto" hablen el mismo idioma de severidad.
export function getWindAlertLevel(speed: number, gust: number | null): WindAlertLevel {
  const effective = Math.max(speed, gust ?? 0)
  if (effective >= 60) return 'SUSPENSION'
  if (effective >= 40) return 'RESTRICCION'
  if (effective >= 25) return 'PRECAUCION'
  return null
}

const LEVEL_RANK: Record<Exclude<WindAlertLevel, null>, number> = {
  PRECAUCION: 1,
  RESTRICCION: 2,
  SUSPENSION: 3,
}

export interface WindForecastPeriod {
  from: Date
  to: Date
  level: WindAlertLevel
  speed: number
  gust: number | null
  /** BECMG / TEMPO / PROB30 TEMPO / franja base de la TAF */
  changeType: string
  probability: number | null
}

export interface RawTafFcst {
  timeFrom: number
  timeTo: number
  fcstChange: string | null
  probability: number | null
  wspd: number | null
  wgst: number | null
}

export interface RawTaf {
  rawTAF: string
  issueTime: string
  validTimeFrom: number
  validTimeTo: number
  fcsts: RawTafFcst[]
}

export interface WindForecast {
  raw: string | null
  issueTime: Date | null
  /** Periodos de HOY (desde ahora hasta medianoche local) con alerta activa */
  periodsToday: WindForecastPeriod[]
  /** El más severo de periodsToday (empate → el más próximo en el tiempo) */
  worstToday: WindForecastPeriod | null
}

const describeChange = (fcstChange: string | null, probability: number | null): string => {
  if (probability != null) return `PROB${probability} ${fcstChange ?? 'TEMPO'}`
  return fcstChange ?? 'PREVISTO'
}

export function parseTaf(data: RawTaf, now: number = Date.now()): WindForecast {
  const endOfLocalDay = new Date(now)
  endOfLocalDay.setHours(23, 59, 59, 999)
  const windowEnd = endOfLocalDay.getTime()

  const periods: WindForecastPeriod[] = []
  for (const f of data.fcsts ?? []) {
    // Solo periodos que declaran viento explícitamente: los grupos TEMPO/BECMG
    // que solo tocan visibilidad o nubes no traen wspd y no deben tratarse
    // como "0 kt seguro" — se ignoran en vez de asumir datos que no están.
    if (f.wspd == null) continue
    const level = getWindAlertLevel(f.wspd, f.wgst)
    if (!level) continue

    const fromMs = f.timeFrom * 1000
    const toMs = f.timeTo * 1000
    // Solo lo que queda de hoy en adelante: si ya terminó, no es útil ahora.
    if (toMs <= now) continue
    if (fromMs > windowEnd) continue

    periods.push({
      from: new Date(fromMs),
      to: new Date(toMs),
      level,
      speed: f.wspd,
      gust: f.wgst,
      changeType: describeChange(f.fcstChange, f.probability),
      probability: f.probability,
    })
  }

  periods.sort((a, b) => a.from.getTime() - b.from.getTime())

  // El más severo; en empate de severidad, el que empieza antes (ya ordenado por 'from').
  let worstToday: WindForecastPeriod | null = null
  for (const p of periods) {
    if (!worstToday || LEVEL_RANK[p.level!] > LEVEL_RANK[worstToday.level!]) {
      worstToday = p
    }
  }

  return {
    raw: data.rawTAF ?? null,
    issueTime: data.issueTime ? new Date(data.issueTime) : null,
    periodsToday: periods,
    worstToday,
  }
}
