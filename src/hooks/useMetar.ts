import { useState, useEffect } from 'react';

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

export function useMetar() {
  const [windData, setWindData] = useState<WindData | null>(null);
  const [alertLevel, setAlertLevel] = useState<WindAlertLevel>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetar = async () => {
    try {
      const res = await fetch(
        'https://aviationweather.gov/api/data/metar?ids=LEMD&format=json'
      );
      const data = await res.json();
      const m = data[0];
      if (!m) return;
      const speed = m.wspd ?? 0;
      const gust = m.wgst ?? null;
      setWindData({
        speed,
        gust,
        direction: m.wdir ?? 0,
        rawMetar: m.rawOb ?? '',
        updatedAt: new Date(),
      });
      setAlertLevel(getWindAlertLevel(speed, gust));
    } catch {
      // Silent fail — no alert shown if METAR unavailable
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
