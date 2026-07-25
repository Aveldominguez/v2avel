import { useCallback, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { parseTaf, type RawTaf, type WindForecast } from './windForecast'

export type { WindAlertLevel, WindForecastPeriod, WindForecast } from './windForecast'
export { getWindAlertLevel } from './windForecast'

export function useWindForecast() {
  const [forecast, setForecast] = useState<WindForecast | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-taf')
      if (fnError) throw new Error(fnError.message)
      const t: RawTaf | null = Array.isArray(data) ? data[0] : null
      if (!t) throw new Error('Sin datos TAF')
      setForecast(parseTaf(t))
    } catch {
      setError('No se pudo obtener la previsión TAF de LEMD')
    } finally {
      setLoading(false)
    }
  }, [])

  return { forecast, loading, error, refresh }
}
