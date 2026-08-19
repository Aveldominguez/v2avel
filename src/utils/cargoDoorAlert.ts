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
 * Ver `salidaEfectiva`.
 *
 * El cierre se mide con `cargoDoorsClosed`, NUNCA con el fin de carga: se
 * puede terminar de cargar y no poder cerrar todavía (repostaje, una última
 * maleta en camino…), y son dos momentos operativos distintos.
 */

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

/** "14:35" → Date de hoy; si quedó a más de 12 h de distancia, es de otro día. */
export const parseClockTime = (hhmm: string, now: Date): Date | null => {
  if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  if (d.getTime() < now.getTime() - 12 * 60 * 60 * 1000) d.setDate(d.getDate() + 1);
  else if (d.getTime() > now.getTime() + 12 * 60 * 60 * 1000) d.setDate(d.getDate() - 1);
  return d;
};

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
  /** Fecha de la escala. Sin ella no se avisa: ver la comprobación de abajo. */
  flightDate?: Date | null;
  now: Date;
}

const mismoDia = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const APAGADO: DoorAlert = {
  level: 'off', secondsToDeadline: 0, minuteMark: 0, marginMinutes: null, shouldBeep: false,
  departureLabel: null, basedOnGroundTime: false,
};

const hhmm = (d: Date): string =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/**
 * Hora de salida real contra la que se mide el H-5.
 *
 * Con el avión ya en plataforma manda la escala programada: si calza a las
 * 19:10 y la aerolínea tiene 40 min de escala, la salida es a las 19:50 y no
 * la ETD de las 19:35 que se quedó por el camino.
 *
 * Se coge la más TARDÍA de las dos porque llegar pronto no adelanta una
 * salida: el avión no se va antes de su hora aunque la escala termine antes.
 */
const salidaEfectiva = (
  prevista: Date | null,
  calzosLlegada: Date | null,
  turnaroundMinutes: number | null | undefined,
): { salida: Date; porEscala: boolean } | null => {
  const porEscala = calzosLlegada && turnaroundMinutes && turnaroundMinutes > 0
    ? new Date(calzosLlegada.getTime() + turnaroundMinutes * 60_000)
    : null;

  if (porEscala && (!prevista || porEscala.getTime() > prevista.getTime())) {
    return { salida: porEscala, porEscala: true };
  }
  return prevista ? { salida: prevista, porEscala: false } : null;
};

export function computeDoorAlert(input: DoorAlertInput): DoorAlert {
  const {
    aircraftModel, departureTime, chocksOnArrival, turnaroundMinutes,
    cargoDoorsClosed, soloLlegada, soloSalida, flightDate, now,
  } = input;

  if (soloLlegada) return APAGADO;
  // Sólo se avisa en escalas de hoy. Al consultar una de hace días, su hora de
  // salida se interpretaría contra el reloj de ahora y saltaría una alarma
  // falsa por un avión que se fue hace tres días.
  if (!flightDate || !mismoDia(flightDate, now)) return APAGADO;
  if (!isNarrowBody(aircraftModel)) return APAGADO;

  // Sin calzos de llegada el avión no está en plataforma: no hay bodega que
  // cerrar y la hora prevista ya no dice nada. Éste era el aviso que saltaba
  // con la escala entera en blanco y sólo sembraba dudas. En sólo salida no
  // hay llegada que esperar, así que ahí no se exige.
  if (!soloSalida && !chocksOnArrival) return APAGADO;

  const calzos = chocksOnArrival ? parseClockTime(chocksOnArrival, now) : null;
  const prevista = departureTime ? parseClockTime(departureTime, now) : null;

  const efectiva = salidaEfectiva(prevista, calzos, turnaroundMinutes);
  if (!efectiva) return APAGADO;
  const { salida, porEscala } = efectiva;

  const limite = salida.getTime() - DOOR_DEADLINE_MIN * 60_000;
  const secondsToDeadline = Math.round((limite - now.getTime()) / 1000);
  const contexto = { departureLabel: hhmm(salida), basedOnGroundTime: porEscala };

  // Puertas ya cerradas: se deja constancia del margen y no se molesta más.
  if (cargoDoorsClosed) {
    const cierre = parseClockTime(cargoDoorsClosed, now);
    return {
      ...APAGADO,
      ...contexto,
      level: 'done',
      secondsToDeadline,
      marginMinutes: cierre ? Math.round((limite - cierre.getTime()) / 60_000) : null,
    };
  }

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
