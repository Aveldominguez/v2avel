/**
 * Qué se puede recuperar de una copia del histórico, en cristiano.
 *
 * El histórico guarda la escala entera tal y como estaba. Para decidir si
 * merece la pena restaurar hay que poder ver de un vistazo QUÉ hay dentro,
 * sin abrir un JSON ni entender nombres de campos.
 */

export interface CopiaHistorico {
  id: string;
  saved_at: string;
  motivo: string | null;
  times: Record<string, unknown> | null;
  field_values: unknown;
  observations: string | null;
  extra: { bulk?: unknown[]; loadSheet?: unknown[] } | null;
  /** -1 marcaba una copia previa a restaurar antes de existir `motivo`. */
  horas_antes?: number | null;
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Puestos por ARION, no son trabajo de nadie y no cuentan como dato perdido. */
const AUTOMATICOS = new Set([
  'scheduledArrival', 'scheduledEta', 'scheduledStd', 'scheduledEtd',
  'departureTime', 'originStation', 'destStation', 'homeStation',
  'ldmRaw', 'airlineLogo', 'baggageBelt', 'aircraftModel', 'matricula',
  'tango', 'remoteLocation', 'departureFlightNumber',
]);

const cuantosEnLista = (v: unknown): number => (Array.isArray(v) ? v.length : 0);

export interface Trozo {
  etiqueta: string;
  cuantos: number;
  /** Las observaciones no se cuentan: se tienen o no. "1 observaciones" chirría. */
  sinNumero?: boolean;
}

/** Lo que contiene una copia, por tipo y con nombres que se entienden. */
export const queTiene = (c: CopiaHistorico): Trozo[] => {
  const t = (c.times ?? {}) as Record<string, unknown>;
  const trozos: Trozo[] = [];

  const horas = Object.entries(t).filter(
    ([k, v]) => !AUTOMATICOS.has(k) && typeof v === 'string' && HORA.test(v),
  ).length;
  if (horas) trozos.push({ etiqueta: horas === 1 ? 'hora' : 'horas', cuantos: horas });

  const bodegas = Object.values((t.bodegasData ?? {}) as Record<string, unknown>).filter(
    (v) => typeof v === 'string' && v.trim() !== '',
  ).length;
  if (bodegas) trozos.push({ etiqueta: bodegas === 1 ? 'bodega' : 'bodegas', cuantos: bodegas });

  const campos = Array.isArray(c.field_values)
    ? (c.field_values as Array<{ value?: unknown }>).filter(
        (f) => typeof f?.value === 'string' && f.value.trim() !== '',
      ).length
    : 0;
  if (campos) trozos.push({ etiqueta: campos === 1 ? 'recuento' : 'recuentos', cuantos: campos });

  const personal = cuantosEnLista(t.personal);
  if (personal) trozos.push({ etiqueta: personal === 1 ? 'persona' : 'personas', cuantos: personal });

  const equipos = cuantosEnLista(t.equipment);
  if (equipos) trozos.push({ etiqueta: equipos === 1 ? 'equipo' : 'equipos', cuantos: equipos });

  const adjuntos =
    cuantosEnLista(t.loadingSheetUrls) + cuantosEnLista(t.fileUrls) + cuantosEnLista(t.observationPhotos);
  if (adjuntos) trozos.push({ etiqueta: adjuntos === 1 ? 'archivo' : 'archivos', cuantos: adjuntos });

  const bulk = cuantosEnLista(c.extra?.bulk);
  if (bulk) trozos.push({ etiqueta: 'contadores Air Canada', cuantos: bulk });

  const lir = cuantosEnLista(c.extra?.loadSheet);
  if (lir) trozos.push({ etiqueta: 'posiciones de LIR', cuantos: lir });

  if ((c.observations ?? '').trim()) trozos.push({ etiqueta: 'observaciones', cuantos: 1, sinNumero: true });

  return trozos;
};

/** "12 horas · 3 bodegas · 2 recuentos", para una línea de resumen. */
export const resumirCopia = (c: CopiaHistorico): string => {
  const t = queTiene(c);
  return t.length === 0
    ? 'sin datos'
    : t.map((x) => (x.sinNumero ? x.etiqueta : `${x.cuantos} ${x.etiqueta}`)).join(' · ');
};

/**
 * Copias que merece la pena ofrecer al operario.
 *
 * Fuera las vacías (no hay nada que devolver) y las que se guardan justo antes
 * de restaurar: esas son la red por si el rescate sale mal, y ofrecerlas de
 * vuelta sólo confunde.
 */
export const esPreviaARestaurar = (c: CopiaHistorico): boolean =>
  // Las copias de antes de que existiera `motivo` se marcaban con -1. Sin
  // mirarlo, al operario se le ofrecían como si fueran una pérdida suya.
  c.motivo === 'antes-de-restaurar' || c.horas_antes === -1;

export const copiasUtiles = (copias: CopiaHistorico[]): CopiaHistorico[] =>
  copias.filter((c) => !esPreviaARestaurar(c) && queTiene(c).length > 0);
