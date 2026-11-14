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
export const NO_SON_DEL_OPERARIO = new Set([
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

/**
 * Una foto de TODO lo que lleva una escala, no sólo las horas.
 *
 * El 14/11 la PC1099 perdió dos veces los recuentos, el personal, los equipos
 * y las observaciones justo después de restaurarlos: la escala estaba abierta
 * y el formulario volvió a subir lo que tenía en pantalla, que estaba vacío.
 * La comprobación de entonces sólo miraba las horas, y las horas no habían
 * cambiado (18 → 18), así que lo dejó pasar.
 */
export interface FotoEscala {
  /**
   * Suelto a propósito: aquí sólo se CUENTA (cuántas horas, cuánta gente),
   * nunca se leen los campos por dentro. Exigir la forma exacta obligaba a
   * forzar el tipo en cada llamada sin ganar nada.
   */
  times?: Record<string, unknown> | Partial<TurnaroundTimes> | null;
  fieldValues?: Array<{ fieldDefinitionId?: string; value?: unknown }> | null;
  observations?: string | null;
}

const conValor = (v: unknown): boolean => typeof v === 'string' && v.trim() !== '';
const largoLista = (v: unknown): number => (Array.isArray(v) ? v.length : 0);

/** Cuánta información lleva, por tipo. Espejo de riqueza_escala() en la base. */
export const riqueza = (f: FotoEscala | null | undefined): Record<string, number> => {
  const t = (f?.times ?? {}) as Record<string, unknown>;
  return {
    horas: Object.entries(t).filter(([k, v]) => !NO_SON_DEL_OPERARIO.has(k) && tieneDato(v)).length,
    bodegas: Object.values((t.bodegasData ?? {}) as Record<string, unknown>).filter(conValor).length,
    personal: largoLista(t.personal),
    equipos: largoLista(t.equipment),
    adjuntos: largoLista(t.loadingSheetUrls) + largoLista(t.fileUrls) + largoLista(t.observationPhotos),
    campos: (Array.isArray(f?.fieldValues) ? f!.fieldValues! : []).filter((x) => conValor(x?.value)).length,
    observaciones: conValor(f?.observations) ? 1 : 0,
  };
};

/** Nombres para el aviso, en cristiano. */
const NOMBRES: Record<string, string> = {
  horas: 'horas', bodegas: 'bodegas', personal: 'personas', equipos: 'equipos',
  adjuntos: 'archivos', campos: 'recuentos', observaciones: 'observaciones',
};

/**
 * Qué tipos de dato se vacían ENTEROS al guardar.
 *
 * Perder una lista completa (todo el personal, todos los recuentos) no es una
 * corrección de nadie: es que se está subiendo una pantalla desfasada.
 */
export const tiposQueSeVacian = (
  antes: FotoEscala | null | undefined,
  despues: FotoEscala | null | undefined,
): string[] => {
  if (!antes) return [];
  const a = riqueza(antes);
  const d = riqueza(despues);
  return Object.keys(a)
    .filter((k) => k !== 'horas' && a[k] > 0 && d[k] === 0)
    .map((k) => NOMBRES[k] ?? k);
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

/**
 * ¿Manda el borrador del móvil o la copia del servidor?
 *
 * Normalmente el borrador, porque es trabajo más reciente que aún no ha
 * subido. Pero al recuperar datos desde OTRO dispositivo, el móvil se queda
 * con un borrador posterior que no los tiene: enseñaba las horas y no el
 * personal ni los recuentos, y había que esperar a que caducara.
 *
 * Un borrador puede tener MÁS que el servidor, nunca dos tipos de dato MENOS.
 * Si los tiene, está desfasado.
 */
export const mandaElBorrador = (
  borrador: (FotoEscala & { savedAt: number }) | null | undefined,
  servidor: (FotoEscala & { updatedAt: number }) | null | undefined,
): boolean => {
  if (!borrador) return false;
  if (!servidor) return true;
  if (tiposQueSeVacian(servidor, borrador).length >= 2) return false;
  return borrador.savedAt > servidor.updatedAt;
};
