import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WindData {
  speed: number;
  gust: number | null;
  direction: number;
  rawMetar: string;
  updatedAt: Date;
}

export type WindAlertLevel = 'precaucion' | 'restriccion' | 'suspension' | null;

export function getWindAlertLevel(speed: number, gust: number | null): WindAlertLevel {
  const effective = Math.max(speed, gust ?? 0);
  if (effective >= 60) return 'suspension';
  if (effective >= 40) return 'restriccion';
  if (effective >= 25) return 'precaucion';
  return null;
}

export const ALERT_CONFIG = {
  precaucion: {
    label: 'PRECAUCIÓN',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-900',
    actions: [
      'Reducir operaciones no esenciales',
      'Asegurar todo el GSE',
      'Evitar movimientos innecesarios alrededor del avión',
    ],
  },
  restriccion: {
    label: 'RESTRICCIÓN OPERATIVA',
    color: 'bg-orange-500',
    textColor: 'text-white',
    actions: [
      'Suspender actividades en rampa no seguras',
      'Mantener despejada el área alrededor del avión',
      'Reforzar anclajes y fijaciones del GSE',
      'Proteger al personal de objetos desplazados',
    ],
  },
  suspension: {
    label: 'SUSPENSIÓN EN TIERRA',
    color: 'bg-red-600',
    textColor: 'text-white',
    actions: [
      'Detener TODA actividad en plataforma inmediatamente',
      'Personal debe buscar refugio seguro',
      'No se permite ningún movimiento de aeronave ni GSE',
    ],
  },
} as const;

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes (catches SPECI reports)

/**
 * Último parte leído, compartido por todos los que usen el hook.
 *
 * La insignia de viento y el registro de la escala lo piden a la vez; sin
 * esto serían dos llamadas cada diez minutos para traer exactamente lo mismo.
 */
let ultimo: { dato: WindData; nivel: WindAlertLevel; ts: number } | null = null;
const VALE_DURANTE = 2 * 60 * 1000;

export function useMetar() {
  const [windData, setWindData] = useState<WindData | null>(null);
  const [alertLevel, setAlertLevel] = useState<WindAlertLevel>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetar = async () => {
    if (ultimo && Date.now() - ultimo.ts < VALE_DURANTE) {
      setWindData(ultimo.dato);
      setAlertLevel(ultimo.nivel);
      setLoading(false);
      return;
    }
    try {
      /*
       * Por la función del servidor, NO directamente.
       *
       * aviationweather.gov no manda cabecera CORS, así que la llamada desde
       * el navegador la bloqueaba siempre. Como el error se tragaba en
       * silencio, la alerta de viento de la escala llevaba todo este tiempo
       * sin funcionar: windData era siempre null y sólo se veía la previsión
       * del TAF, nunca el viento que había de verdad.
       */
      const { data, error } = await supabase.functions.invoke('get-metar');
      if (error) throw new Error(error.message);
      const m = Array.isArray(data) ? data[0] : null;
      if (!m) return;
      const speed = m.wspd ?? 0;
      const gust = m.wgst ?? null;
      const dato: WindData = {
        speed,
        gust,
        direction: m.wdir ?? 0,
        rawMetar: m.rawOb ?? '',
        // La hora del PARTE, no la de ahora: dos lecturas del mismo METAR no
        // pueden parecer dos observaciones distintas en el registro.
        updatedAt: m.reportTime ? new Date(m.reportTime) : new Date(),
      };
      const nivel = getWindAlertLevel(speed, gust);
      ultimo = { dato, nivel, ts: Date.now() };
      setWindData(dato);
      setAlertLevel(nivel);
    } catch (e) {
      // Sin parte no se inventa una alerta, pero que quede en la consola:
      // tragárselo del todo es lo que escondió el fallo durante semanas.
      console.warn('[metar] no se pudo leer el parte:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetar();
    const id = setInterval(fetchMetar, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return { windData, alertLevel, loading, refresh: fetchMetar };
}
