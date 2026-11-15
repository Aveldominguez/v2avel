import { getWindAlertLevel, type WindAlertLevel } from '@/hooks/useMetar';

/**
 * La meteorología que había mientras se trabajaba la escala.
 *
 * Sirve para responder, semanas después, a "¿por qué no se pusieron los
 * conos?". Sin esto hay que fiarse de la memoria; con esto está el parte
 * oficial del aeropuerto de aquella media hora, con su viento y su racha.
 *
 * Se guarda DENTRO de la escala a propósito: así hereda el borrador del
 * móvil, la cola sin cobertura, el histórico de pérdidas y la protección
 * contra guardados que vacían. Una tabla aparte sería un camino nuevo por
 * donde perderlo.
 */

export interface ObservacionMeteo {
  /** Momento de la observación, en ISO (lo que manda el aeropuerto, en UTC). */
  hora: string;
  direccion: number | null;
  /** Viento sostenido, en nudos. */
  kt: number | null;
  /** Racha máxima, en nudos. null si no hubo. */
  racha: number | null;
  alerta: WindAlertLevel;
  /** El METAR tal cual lo emite el aeropuerto: esto es lo que vale como prueba. */
  raw: string;
}

/**
 * Lo que la previsión (TAF) decía para el rato de la escala, anotado AL
 * EMPEZAR.
 *
 * El TAF se emite unas pocas veces al día y vale durante muchas horas, así
 * que con tenerlo una vez al poner calzos de llegada basta: no hace falta
 * pedirlo otra vez al cerrar. Y sirve para lo que el METAR no puede: explicar
 * una decisión tomada ANTES de que el viento llegara.
 */
export interface PrevisionDeEscala {
  anotadoEn: string;
  alerta: WindAlertLevel;
  desde: string;
  hasta: string;
  kt: number;
  racha: number | null;
  /** BECMG, TEMPO, PROB30… tal y como lo dice el TAF. */
  tipo: string;
}

export interface MeteoEscala {
  ventana: { desde: string; hasta: string };
  /** Cuándo se registró. Una vez puesto no se toca: es la prueba. */
  registradoEn: string;
  observaciones: ObservacionMeteo[];
  /** Lo peor del intervalo, que es lo que hay que poder enseñar. */
  maximo: { kt: number; racha: number | null; alerta: WindAlertLevel } | null;
  /** El TAF vigente: lo que estaba PREVISTO, además de lo que pasó. */
  taf: string | null;
  /** La previsión que afectaba a tu intervalo, anotada al empezar. */
  prevision?: PrevisionDeEscala | null;
}

/** "09:20" sobre una fecha concreta → instante real. */
export const momentoDe = (fecha: Date, hhmm: string | null | undefined): Date | null => {
  if (!hhmm || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(fecha);
  d.setHours(h, m, 0, 0);
  return d;
};

/** Horas con formato HH:mm que haya apuntado el operario, ordenadas. */
const horasApuntadas = (times: Record<string, unknown>): string[] =>
  Object.entries(times)
    .filter(([k, v]) =>
      typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) &&
      !k.startsWith('scheduled') && k !== 'departureTime')
    .map(([, v]) => v as string)
    .sort();

export interface Ventana { desde: Date; hasta: Date }

/**
 * El intervalo de la escala: de calzos de llegada a calzos de salida.
 *
 * Si falta alguno de los dos se usa la primera y la última hora apuntada, que
 * es lo más parecido a cuando se estuvo trabajando. Con una sola hora no hay
 * intervalo que valga y se devuelve null: inventarse un margen sería dar por
 * probado algo que no se sabe.
 */
export const ventanaDeEscala = (
  fecha: Date,
  times: Record<string, unknown>,
): Ventana | null => {
  const calzosOn = momentoDe(fecha, times.chocksOnArrival as string);
  const calzosOff = momentoDe(fecha, times.chocksOff as string);

  let desde = calzosOn;
  let hasta = calzosOff;

  if (!desde || !hasta) {
    const todas = horasApuntadas(times);
    if (todas.length < 2) return null;
    desde = desde ?? momentoDe(fecha, todas[0]);
    hasta = hasta ?? momentoDe(fecha, todas[todas.length - 1]);
  }
  if (!desde || !hasta) return null;

  // Una escala que cruza la medianoche: la salida es del día siguiente.
  if (hasta.getTime() < desde.getTime()) hasta = new Date(hasta.getTime() + 86_400_000);

  return { desde, hasta };
};

/** Lo que manda la API del aeropuerto, con los nombres que usa. */
export interface ObsCruda {
  reportTime?: string;
  wdir?: number | string | null;
  wspd?: number | null;
  wgst?: number | null;
  rawOb?: string | null;
}

const numero = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

/**
 * Observaciones que cubren el intervalo.
 *
 * Se incluye además la anterior al inicio: el METAR se emite cada media hora,
 * así que el parte vigente cuando empezaste suele ser de antes. Sin él, una
 * escala corta entre dos emisiones se quedaría sin ninguna observación.
 */
export const observacionesDeLaVentana = (
  crudas: ObsCruda[],
  v: Ventana,
): ObservacionMeteo[] => {
  const conFecha = crudas
    .map((o) => ({ o, t: o.reportTime ? new Date(o.reportTime).getTime() : NaN }))
    .filter((x) => Number.isFinite(x.t))
    .sort((a, b) => a.t - b.t);

  const desde = v.desde.getTime();
  const hasta = v.hasta.getTime();

  const dentro = conFecha.filter((x) => x.t >= desde && x.t <= hasta);
  const previa = [...conFecha].reverse().find((x) => x.t < desde);
  const elegidas = previa ? [previa, ...dentro] : dentro;

  return elegidas.map(({ o, t }) => {
    const kt = numero(o.wspd);
    const racha = numero(o.wgst);
    return {
      hora: new Date(t).toISOString(),
      direccion: numero(o.wdir),
      kt,
      racha,
      alerta: getWindAlertLevel(kt ?? 0, racha),
      raw: (o.rawOb ?? '').trim(),
    };
  });
};

/** Lo peor del intervalo: es lo que hay que poder enseñar. */
export const peorDelIntervalo = (obs: ObservacionMeteo[]): MeteoEscala['maximo'] => {
  if (obs.length === 0) return null;
  let mejor = obs[0];
  let peorValor = -1;
  for (const o of obs) {
    const valor = Math.max(o.kt ?? 0, o.racha ?? 0);
    if (valor > peorValor) { peorValor = valor; mejor = o; }
  }
  return { kt: mejor.kt ?? 0, racha: mejor.racha, alerta: mejor.alerta };
};

/** "Viento máx. 28 kt · PRECAUCIÓN", para una línea de resumen. */
export const resumenMeteo = (m: MeteoEscala | null | undefined): string => {
  if (!m?.maximo) return '';
  const { kt, racha, alerta } = m.maximo;
  const pico = Math.max(kt, racha ?? 0);
  const etiqueta = alerta ? ` · ${alerta.toUpperCase()}` : '';
  return `Viento máx. ${pico} kt${racha ? ` (racha ${racha})` : ''}${etiqueta}`;
};

/**
 * Pide al servidor la meteorología del intervalo y la deja lista para guardar.
 *
 * Devuelve null cuando no hay intervalo o el aeropuerto no da partes de ese
 * rato: es preferible no guardar nada a guardar un registro vacío que luego
 * parezca que dice "no hubo viento".
 */
export const registrarMeteoDeEscala = async (
  fecha: Date,
  times: Record<string, unknown>,
  invocar: (nombre: string, opciones: { body: unknown }) => Promise<{ data: unknown; error: unknown }>,
): Promise<MeteoEscala | null> => {
  const v = ventanaDeEscala(fecha, times);
  if (!v) return null;

  const { data, error } = await invocar('meteo-escala', {
    body: { desde: v.desde.toISOString() },
  });
  if (error) throw error;

  const cuerpo = (data ?? {}) as { observaciones?: ObsCruda[]; taf?: string | null };
  const obs = observacionesDeLaVentana(cuerpo.observaciones ?? [], v);
  if (obs.length === 0) return null;

  return {
    ventana: { desde: v.desde.toISOString(), hasta: v.hasta.toISOString() },
    registradoEn: new Date().toISOString(),
    observaciones: obs,
    maximo: peorDelIntervalo(obs),
    taf: cuerpo.taf ?? null,
  };
};

/** Un periodo del TAF, con lo que necesita este módulo. */
export interface PeriodoTaf {
  from: Date;
  to: Date;
  /**
   * El TAF lo da en MAYÚSCULAS ('PRECAUCION') y el METAR en minúsculas. Se
   * acepta como texto y se normaliza, en vez de obligar a que coincidan dos
   * módulos que nacieron por separado.
   */
  level: string | null;
  speed: number;
  gust: number | null;
  changeType: string;
}

/**
 * De los periodos con alerta del TAF, el que pilla tu intervalo y es peor.
 *
 * Se mira el solape, no si está dentro: una previsión de 09:00 a 12:00 afecta
 * a una escala de 09:20 a 10:05 aunque ni empiece ni acabe con ella.
 */
export const previsionParaVentana = (
  periodos: PeriodoTaf[] | null | undefined,
  v: Ventana,
): PrevisionDeEscala | null => {
  if (!periodos || periodos.length === 0) return null;
  const desde = v.desde.getTime();
  const hasta = v.hasta.getTime();

  const solapan = periodos.filter(
    (p) => p.level && p.from.getTime() < hasta && p.to.getTime() > desde,
  );
  if (solapan.length === 0) return null;

  const peor = solapan.reduce((a, b) =>
    Math.max(b.speed, b.gust ?? 0) > Math.max(a.speed, a.gust ?? 0) ? b : a);

  return {
    anotadoEn: new Date().toISOString(),
    alerta: (peor.level ? peor.level.toLowerCase() : null) as WindAlertLevel,
    desde: peor.from.toISOString(),
    hasta: peor.to.toISOString(),
    kt: peor.speed,
    racha: peor.gust,
    tipo: peor.changeType,
  };
};

/**
 * Hasta dónde llega el histórico del aeropuerto.
 *
 * La API devuelve como mucho 400 observaciones y se emite una cada media
 * hora, así que son poco más de 8 días. Se dejan 8 justos para no prometer
 * un rescate que luego vuelve vacío.
 */
export const DIAS_DE_HISTORICO = 8;

/** ¿Se puede todavía rellenar la meteorología de una escala ya trabajada? */
export const sePuedeRellenar = (
  fecha: Date,
  times: Record<string, unknown>,
  ahora: Date = new Date(),
): boolean => {
  if (times.meteo) return false;                       // ya está registrada
  if (!ventanaDeEscala(fecha, times)) return false;    // sin intervalo no hay nada que pedir
  const limite = ahora.getTime() - DIAS_DE_HISTORICO * 86_400_000;
  return fecha.getTime() >= limite;
};
