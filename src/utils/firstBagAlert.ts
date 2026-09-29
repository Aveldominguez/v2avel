import { parseClockTime } from './effectiveDeparture';
import { sameDayOrNext } from './cargoDoorAlert';
import type { TurnaroundTimes } from '@/types/turnaround';

/**
 * Aviso de envío de la primera maleta.
 *
 * Norma de la empresa: las primeras maletas salen a los 10 minutos de haber
 * marcado el inicio de descarga. La cuenta atrás se calcula sola desde ese
 * dato y se apaga en cuanto se registra la 1ª maleta, así que no hay nada que
 * poner a mano.
 */

/** Minutos desde el inicio de descarga para enviar las primeras maletas. */
export const FIRST_BAG_DEADLINE_MIN = 10;
/** Minutos que quedan cuando salta el preaviso. */
export const FIRST_BAG_HEADS_UP_MIN = 3;

export type FirstBagLevel =
  | 'off'      // No aplica: sin inicio de descarga, o escala que no es de hoy
  | 'running'  // Queda margen
  | 'soon'     // Últimos minutos
  | 'late'     // Pasado el plazo sin registrar la maleta
  | 'done';    // Maleta registrada

export interface FirstBagAlert {
  level: FirstBagLevel;
  /** Segundos hasta el plazo. Negativo si ya pasó. */
  secondsToDeadline: number;
  /** Minutos que se tardó en enviarla, una vez registrada. */
  elapsedMinutes: number | null;
  /** Se envió dentro del plazo. */
  onTime: boolean;
  /** Qué pitido toca, o null. Cada uno suena una sola vez. */
  beep: 'headsUp' | 'deadline' | null;
}

const APAGADO: FirstBagAlert = {
  level: 'off', secondsToDeadline: 0, elapsedMinutes: null, onTime: true, beep: null,
};

const mismoDia = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export interface FirstBagInput {
  unloadingStart: string | null | undefined;
  firstBag: string | null | undefined;
  soloSalida?: boolean;
  /** Sin fecha de escala no hay aviso: ver la comprobación de abajo. */
  flightDate?: Date | null;
  now: Date;
}

export function computeFirstBagAlert(input: FirstBagInput): FirstBagAlert {
  const { unloadingStart, firstBag, soloSalida, flightDate, now } = input;

  // En sólo salida no hay descarga que cronometrar.
  if (soloSalida) return APAGADO;
  if (!unloadingStart) return APAGADO;

  const inicio = parseClockTime(unloadingStart, now);
  if (!inicio) return APAGADO;

  const limite = inicio.getTime() + FIRST_BAG_DEADLINE_MIN * 60_000;

  // Maleta ya enviada: queda la constancia de cuánto se tardó, y se puede
  // consultar en cualquier momento, también días después.
  if (firstBag) {
    const maleta = sameDayOrNext(parseClockTime(firstBag, now), inicio);
    const elapsed = maleta ? Math.round((maleta.getTime() - inicio.getTime()) / 60_000) : null;
    return {
      ...APAGADO,
      level: 'done',
      elapsedMinutes: elapsed,
      onTime: elapsed === null || elapsed <= FIRST_BAG_DEADLINE_MIN,
    };
  }

  // A partir de aquí es una cuenta atrás en vivo, que mira el reloj: sólo en
  // las escalas de hoy. Al abrir una de hace días no debe sonar nada.
  if (!flightDate || !mismoDia(flightDate, now)) return APAGADO;

  const secondsToDeadline = Math.round((limite - now.getTime()) / 1000);
  // Un inicio de descarga de hace horas ya no es una cuenta atrás.
  if (secondsToDeadline < -60 * 60) return APAGADO;

  const minutosRestantes = Math.ceil(secondsToDeadline / 60);

  if (secondsToDeadline <= 0) {
    return {
      ...APAGADO,
      level: 'late',
      secondsToDeadline,
      onTime: false,
      // El aviso del plazo suena una vez, en el minuto en que se agota.
      beep: minutosRestantes === 0 ? 'deadline' : null,
    };
  }

  const nivel: FirstBagLevel = minutosRestantes <= FIRST_BAG_HEADS_UP_MIN ? 'soon' : 'running';
  return {
    ...APAGADO,
    level: nivel,
    secondsToDeadline,
    beep: minutosRestantes === FIRST_BAG_HEADS_UP_MIN ? 'headsUp' : null,
  };
}
