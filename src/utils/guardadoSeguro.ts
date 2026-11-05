import type { TurnaroundTimes } from '@/types/turnaround';

/**
 * Red de seguridad contra guardados que VACÍAN una escala.
 *
 * La AZ058 del 5/11 se perdió porque un guardado automático subió una copia
 * incompleta encima de la buena. Aquel camino concreto ya está cerrado, pero
 * esto vale para cualquier otro: antes de escribir se compara con lo que había
 * y, si el cambio hace desaparecer datos que ya estaban, no pasa solo.
 *
 * Un operario corrige una hora suelta, o la borra porque la apuntó mal. Lo
 * que no hace nunca es vaciar media escala de golpe: eso es un fallo.
 */

/** A partir de aquí no es una corrección: es un borrado en masa. */
export const LIMITE_CAMPOS_PERDIDOS = 3;

/** Campos que no los escribe el operario: los pone ARION o la propia app. */
const NO_SON_DEL_OPERARIO = new Set([
  'scheduledArrival', 'scheduledEta', 'scheduledStd', 'scheduledEtd',
  'originStation', 'destStation', 'homeStation', 'ldmRaw', 'airlineLogo',
  'baggageBelt', 'cpmRawLines', 'aircraftModel', 'departureTime',
  'departureFlightNumber', 'matricula', 'tango', 'remoteLocation',
]);

const esHora = (v: unknown): v is string =>
  typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/** Valores que cuentan como "dato apuntado": horas y recuentos. */
const tieneDato = (v: unknown): boolean => esHora(v) || (typeof v === 'string' && /^\d+$/.test(v));

/** Campos con dato que desaparecen al pasar de `antes` a `despues`. */
export const camposQueSePierden = (
  antes: Partial<TurnaroundTimes> | null | undefined,
  despues: Partial<TurnaroundTimes> | null | undefined,
): string[] => {
  if (!antes) return [];
  const nuevo = (despues ?? {}) as Record<string, unknown>;
  return Object.entries(antes as Record<string, unknown>)
    .filter(([clave, valor]) =>
      !NO_SON_DEL_OPERARIO.has(clave) && tieneDato(valor) && !tieneDato(nuevo[clave]))
    .map(([clave]) => clave);
};

export interface Veredicto {
  /** Hay que parar y preguntar antes de escribir. */
  peligroso: boolean;
  perdidos: string[];
}

/**
 * ¿Este guardado borra demasiado?
 *
 * `antes` es lo último que se sabe que estaba guardado en el servidor.
 */
export const revisarGuardado = (
  antes: Partial<TurnaroundTimes> | null | undefined,
  despues: Partial<TurnaroundTimes> | null | undefined,
): Veredicto => {
  const perdidos = camposQueSePierden(antes, despues);
  return { peligroso: perdidos.length >= LIMITE_CAMPOS_PERDIDOS, perdidos };
};
