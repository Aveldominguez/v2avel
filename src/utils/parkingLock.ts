import type { TurnaroundTimes } from '@/types/turnaround';

/**
 * Cuándo debe la app dejar de vigilar el parking en ARION.
 *
 * ARION publica el puesto asignado, pero el aeropuerto cambia aviones de sitio
 * sin que ARION se entere. Mientras se trabaja la escala, la comprobación
 * automática machacaba el parking real por el equivocado cada pocos minutos: y
 * como el puesto decide si la escala es remota, cambiaban también los campos de
 * hora en pantalla. Caso real: avión llevado al remoto 11 con ARION diciendo
 * T18, corrigiéndolo a mano una y otra vez.
 *
 * El criterio es operativo: en cuanto hay una hora registrada, el avión ya está
 * recibido en un puesto concreto y de ahí no se mueve. Lo que diga ARION a
 * partir de ese momento sobra.
 */

/**
 * Horas que NO registra el operario: vienen de ARION o del horario. Si contaran
 * como registro, la escala quedaría fijada nada más abrirla, porque la hora de
 * salida se rellena sola desde ARION.
 */
const NOT_OPERATOR_TIMES = new Set([
  'departureTime', 'scheduledArrival', 'scheduledEta', 'scheduledStd', 'scheduledEtd',
]);

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** ¿Hay alguna hora apuntada por el operario en la escala? */
export const hasRecordedTime = (times: Partial<TurnaroundTimes> | null | undefined): boolean => {
  if (!times) return false;
  return Object.entries(times).some(
    ([k, v]) => !NOT_OPERATOR_TIMES.has(k) && typeof v === 'string' && HHMM.test(v),
  );
};

/**
 * ¿Se deja de consultar el parking en ARION?
 * Sí en cuanto el avión está recibido, es decir, en cuanto hay una hora puesta.
 */
export const isParkingLocked = (times: Partial<TurnaroundTimes> | null | undefined): boolean =>
  hasRecordedTime(times);

export type ParkingAction = 'ignore' | 'apply' | 'suggest';

/**
 * Qué hacer con el parking que acaba de devolver ARION.
 *
 * - `ignore`  → coincide con el actual, o la escala ya está fijada.
 * - `apply`   → la escala aún no tiene parking: rellenarlo no pisa nada.
 * - `suggest` → hay parking y no coincide: se avisa, NUNCA se sobrescribe solo.
 */
export function decideParkingUpdate(
  arionCode: string | null | undefined,
  currentParking: string,
  times: Partial<TurnaroundTimes> | null | undefined,
): ParkingAction {
  const code = (arionCode ?? '').trim().toUpperCase();
  if (!code) return 'ignore';
  if (isParkingLocked(times)) return 'ignore';

  const actual = (currentParking ?? '').trim().toUpperCase();
  if (code === actual) return 'ignore';
  return actual ? 'suggest' : 'apply';
}
