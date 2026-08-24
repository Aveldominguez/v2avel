/**
 * Aviso en vivo del cierre de puertas de bodega.
 *
 * Normativa: en aeronaves Narrow Body las puertas de carga deben quedar
 * cerradas en H-5, cinco minutos antes de la hora de salida.
 *
 * Se avisa antes del límite, no encima: preaviso en H-15 e insistencia desde
 * H-10 minuto a minuto hasta que se registra el cierre. El objetivo es llegar
 * a H-5 con las puertas ya cerradas, no enterarse justo en H-5.
 *
 * La hora de salida contra la que se mide NO es sin más la prevista (ETD/STD):
 * cuando el avión llega tarde esa hora ya no se va a cumplir, y avisar contra
 * ella pedía cerrar bodegas de un avión que todavía venía de camino. Manda el
 * terreno: calzos de llegada más la escala que la aerolínea tiene programada.
 * Ver `effectiveDeparture`, que comparte esa regla con el cronómetro.
 *
 * El cierre se mide con `cargoDoorsClosed`, NUNCA con el fin de carga: se
 * puede terminar de cargar y no poder cerrar todavía (repostaje, una última
 * maleta en camino…), y son dos momentos operativos distintos.
 *
 * Una vez registrado el cierre, la constancia («cerradas con X min de margen»)
 * es un dato de la escala, no una alarma: se puede consultar siempre, también
 * en escalas terminadas de días anteriores. Lo que se limita a las escalas de
 * hoy son los avisos en vivo, que son los que miran el reloj.
 */

import { parseClockTime, effectiveDeparture } from './effectiveDeparture';

export { parseClockTime };

/** Minuto antes de la salida en el que las puertas deben estar cerradas. */
export const DOOR_DEADLINE_MIN = 5;
/** Preaviso: aparece el aviso y suena una vez. */
export const DOOR_HEADS_UP_MIN = 15;
/** Desde aquí se insiste cada minuto hasta que se registre el cierre. */
export const DOOR_URGENT_MIN = 10;

/**
 * Aviones de fuselaje ancho, excluidos de la normativa. Se listan los anchos
 * en vez de los estrechos porque son muchos menos y porque un modelo nuevo
 * sin clasificar es casi siempre un Narrow Body: así el aviso sale de más
 * antes que de menos.
 */
const WIDE_BODY = ['A330', 'A333', 'A339', 'A340', 'A350', 'B767', 'B777', 'B787', '767', '777', '787'];

export const isNarrowBody = (aircraftModel: string | null | undefined): boolean => {
  const m = (aircraftModel ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!m) return false; // Sin modelo no se inventa: no se avisa.
  return !WIDE_BODY.some((w) => m.includes(w));
};

export type DoorAlertLevel =
  | 'off'      // No aplica: no es Narrow Body, el avión no ha llegado o falta mucho
  | 'headsUp'  // H-15: ve cerrando
  | 'urgent'   // H-10: insiste cada minuto
  | 'late'     // Pasado H-5 sin cerrar: fuera de normativa
  | 'done';    // Puertas cerradas

export interface DoorAlert {
  level: DoorAlertLevel;
  /** Segundos que faltan para H-5, el límite real. Negativo si ya pasó. */
  secondsToDeadline: number;
  /** Minuto entero al que corresponde el aviso; sirve para no repetir pitidos. */
  minuteMark: number;
  /** Con las puertas ya cerradas: minutos de margen respecto a H-5 (+ = a tiempo). */
  marginMinutes: number | null;
  shouldBeep: boolean;
  /** Salida contra la que se mide el H-5 (HH:mm), para enseñarla en el aviso. */
  departureLabel: string | null;
  /** La salida sale de calzos + escala porque el avión llegó tarde, no del ETD. */
  basedOnGroundTime: boolean;
}

export interface DoorAlertInput {
  aircraftModel: string | null | undefined;
  /** Salida prevista (ETD de ARION o escrita a mano en la escala), HH:mm. */
  departureTime: string | null | undefined;
  /** Calzos de llegada registrados (HH:mm). Sin ellos el avión no está en plataforma. */
  chocksOnArrival?: string | null;
  /** Escala que la aerolínea tiene programada para este modelo, en minutos. */
  turnaroundMinutes?: number | null;
  /** Hora de cierre de puertas ya registrada (HH:mm), si la hay. */
  cargoDoorsClosed: string | null | undefined;
  soloLlegada?: boolean;
  /** Escala sin vuelo de llegada: no hay calzos que esperar, el avión ya está. */
  soloSalida?: boolean;
  /**
   * Fecha de la escala. Sin ella no hay avisos en vivo (ver la comprobación de
   * abajo) y, además, es lo que ancla las horas HH:mm al día correcto cuando se
   * consulta una escala ya terminada.
   */
  flightDate?: Date | null;
  now: Date;
}

const mismoDia = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Mediodía del día de la escala. Es la referencia con la que se interpretan las
 * HH:mm de una escala que no es la de hoy: desde el mediodía, cualquier hora
 * del día cae dentro de la ventana de ±12 h de `parseClockTime` y aterriza en
 * su propio día, en vez de en el de hoy.
 */
const aMediodia = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
};

/**
 * Una hora anterior a los calzos de llegada es en realidad del día siguiente:
 * la escala cruzó la medianoche (calza a las 23:50 y sale a las 00:30).
 */
const trasCalzos = (hora: Date | null, calzos: Date | null): Date | null => {
  if (!hora || !calzos || hora.getTime() >= calzos.getTime()) return hora;
  const d = new Date(hora);
  d.setDate(d.getDate() + 1);
  return d;
};

const APAGADO: DoorAlert = {
  level: 'off', secondsToDeadline: 0, minuteMark: 0, marginMinutes: null, shouldBeep: false,
  departureLabel: null, basedOnGroundTime: false,
};

const hhmm = (d: Date): string =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function computeDoorAlert(input: DoorAlertInput): DoorAlert {
  const {
    aircraftModel, departureTime, chocksOnArrival, turnaroundMinutes,
    cargoDoorsClosed, soloLlegada, soloSalida, flightDate, now,
  } = input;

  if (soloLlegada) return APAGADO;
  if (!isNarrowBody(aircraftModel)) return APAGADO;

  const esDeHoy = !!flightDate && mismoDia(flightDate, now);

  // Con qué reloj se leen las HH:mm de la escala. En la de hoy, el de ahora.
  // En una terminada, el mediodía de SU día: si no, las horas se colocarían
  // alrededor de hoy y el margen saldría de comparar días distintos.
  const ref = esDeHoy || !flightDate ? now : aMediodia(flightDate);

  const calzos = chocksOnArrival ? parseClockTime(chocksOnArrival, ref) : null;
  const prevista = trasCalzos(departureTime ? parseClockTime(departureTime, ref) : null, calzos);

  const efectiva = effectiveDeparture(prevista, calzos, turnaroundMinutes);
  const limite = efectiva ? efectiva.salida.getTime() - DOOR_DEADLINE_MIN * 60_000 : null;
  const contexto = efectiva
    ? { departureLabel: hhmm(efectiva.salida), basedOnGroundTime: efectiva.porEscala }
    : { departureLabel: null, basedOnGroundTime: false };

  // Puertas ya cerradas: se deja constancia del margen y no se molesta más.
  // Esto NO es una alarma sino un dato de la escala, así que se muestra siempre,
  // también días después: es lo que se consulta al revisar una escala terminada.
  // Por lo mismo no exige calzos ni salida calculable; sin ellos se enseña el
  // cierre sin margen, que sigue siendo mejor que no enseñar nada.
  if (cargoDoorsClosed) {
    const cierre = trasCalzos(parseClockTime(cargoDoorsClosed, ref), calzos);
    return {
      ...APAGADO,
      ...contexto,
      level: 'done',
      secondsToDeadline: limite !== null && esDeHoy ? Math.round((limite - now.getTime()) / 1000) : 0,
      marginMinutes: limite !== null && cierre ? Math.round((limite - cierre.getTime()) / 60_000) : null,
    };
  }

  // A partir de aquí son avisos en vivo, que miran el reloj: sólo en las escalas
  // de hoy. En una de hace días su hora de salida se mediría contra el reloj de
  // ahora y saltaría una alarma falsa por un avión que se fue hace tres días.
  if (!esDeHoy) return APAGADO;

  // Sin calzos de llegada el avión no está en plataforma: no hay bodega que
  // cerrar y la hora prevista ya no dice nada. Éste era el aviso que saltaba
  // con la escala entera en blanco y sólo sembraba dudas. En sólo salida no
  // hay llegada que esperar, así que ahí no se exige.
  if (!soloSalida && !chocksOnArrival) return APAGADO;

  if (!efectiva || limite === null) return APAGADO;
  const { salida } = efectiva;
  const secondsToDeadline = Math.round((limite - now.getTime()) / 1000);

  // Minutos que faltan para la SALIDA, que es como se nombra la normativa
  // (H-15, H-10, H-5). Se redondea hacia arriba: a falta de 9 min y 20 s
  // todavía se está "en el minuto 10", como lee un reloj de cuenta atrás.
  const minutosASalida = Math.ceil((salida.getTime() - now.getTime()) / 60_000);

  if (minutosASalida > DOOR_HEADS_UP_MIN) {
    return { ...APAGADO, ...contexto, secondsToDeadline, minuteMark: minutosASalida };
  }

  // Un vuelo que salió hace rato no debe seguir pitando en el bolsillo.
  if (minutosASalida < -60) return APAGADO;

  const level: DoorAlertLevel =
    minutosASalida > DOOR_URGENT_MIN ? 'headsUp'
    : minutosASalida > DOOR_DEADLINE_MIN ? 'urgent'
    : 'late';

  // El preaviso suena una sola vez; desde H-10 se insiste cada minuto.
  const shouldBeep = level === 'headsUp' ? minutosASalida === DOOR_HEADS_UP_MIN : true;

  return {
    ...contexto,
    level,
    secondsToDeadline,
    minuteMark: minutosASalida,
    marginMinutes: null,
    shouldBeep,
  };
}

/** "-1:20" pasado el límite, "4:05" antes. */
export const formatCountdown = (seconds: number): string => {
  const signo = seconds < 0 ? '-' : '';
  const abs = Math.abs(seconds);
  return `${signo}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
};
