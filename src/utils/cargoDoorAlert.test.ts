import { describe, it, expect } from 'vitest';
import {
  computeDoorAlert, isNarrowBody, formatCountdown, parseClockTime,
} from './cargoDoorAlert';

/**
 * `now` a `min` minutos de una salida a las 14:00, con el avión ya calzado a
 * las 13:00: 40 min de escala terminan a las 13:40, antes de la salida
 * prevista, así que manda la prevista y el H-5 cae en 13:55.
 */
const aFaltaDe = (min: number, extra: Partial<Parameters<typeof computeDoorAlert>[0]> = {}) => {
  const salida = new Date('2026-08-16T14:00:00');
  return computeDoorAlert({
    aircraftModel: 'A321',
    departureTime: '14:00',
    chocksOnArrival: '13:00',
    turnaroundMinutes: 40,
    cargoDoorsClosed: null,
    flightDate: salida,
    now: new Date(salida.getTime() - min * 60_000),
    ...extra,
  });
};

describe('isNarrowBody', () => {
  it('los modelos que operamos a diario son narrow body', () => {
    ['A319', 'A320', 'A321', 'A321_XLR', 'B737', '737-800', '737_MAX', 'EMB90', 'A220']
      .forEach(m => expect(isNarrowBody(m), m).toBe(true));
  });

  it('los de fuselaje ancho quedan fuera de la normativa', () => {
    ['A333', 'A339', 'B767', 'B777', '787-800', '787-900']
      .forEach(m => expect(isNarrowBody(m), m).toBe(false));
  });

  it('sin modelo no se avisa: no se adivina', () => {
    expect(isNarrowBody(null)).toBe(false);
    expect(isNarrowBody('')).toBe(false);
  });
});

describe('niveles del aviso', () => {
  it('lejos de la salida no aparece nada', () => {
    expect(aFaltaDe(40).level).toBe('off');
    expect(aFaltaDe(16).level).toBe('off');
  });

  it('H-15 es el preaviso y suena una sola vez', () => {
    expect(aFaltaDe(15).level).toBe('headsUp');
    expect(aFaltaDe(15).shouldBeep).toBe(true);
    // Ya dentro del minuto 14 no vuelve a pitar hasta H-10.
    expect(aFaltaDe(13).shouldBeep).toBe(false);
    expect(aFaltaDe(11).level).toBe('headsUp');
  });

  it('desde H-10 insiste en cada minuto', () => {
    [10, 9, 8, 7, 6].forEach(m => {
      expect(aFaltaDe(m).level, `${m} min`).toBe('urgent');
      expect(aFaltaDe(m).shouldBeep, `${m} min`).toBe(true);
    });
  });

  it('pasado H-5 sin cerrar queda fuera de normativa y sigue avisando', () => {
    expect(aFaltaDe(4).level).toBe('late');
    expect(aFaltaDe(0).level).toBe('late');
    expect(aFaltaDe(-3).level).toBe('late');
    expect(aFaltaDe(-3).shouldBeep).toBe(true);
  });

  it('un vuelo que ya salió hace rato deja de pitar en el bolsillo', () => {
    expect(aFaltaDe(-90).level).toBe('off');
  });
});

describe('cuándo NO debe avisar', () => {
  it('en fuselaje ancho no aplica la normativa', () => {
    expect(aFaltaDe(7, { aircraftModel: 'B777' }).level).toBe('off');
  });

  it('sin salida prevista ni escala calculable no hay cuenta atrás', () => {
    expect(aFaltaDe(7, { departureTime: null, turnaroundMinutes: null }).level).toBe('off');
    expect(aFaltaDe(7, { departureTime: 'sale ya', turnaroundMinutes: null }).level).toBe('off');
  });

  it('en escalas de sólo llegada no hay cierre de bodegas', () => {
    expect(aFaltaDe(7, { soloLlegada: true }).level).toBe('off');
  });
});

describe('el avión tiene que estar en plataforma', () => {
  // El fallo real: escala en blanco, avión todavía en el aire y el aviso
  // pidiendo cerrar bodegas contra una ETD que ya no se iba a cumplir.
  it('sin calzos de llegada no se avisa aunque la ETD esté encima', () => {
    expect(aFaltaDe(7, { chocksOnArrival: null }).level).toBe('off');
    expect(aFaltaDe(0, { chocksOnArrival: null }).level).toBe('off');
    expect(aFaltaDe(7, { chocksOnArrival: null }).shouldBeep).toBe(false);
  });

  it('en sólo salida no hay llegada que esperar y el aviso funciona', () => {
    const a = aFaltaDe(7, { chocksOnArrival: null, soloSalida: true });
    expect(a.level).toBe('urgent');
    expect(a.departureLabel).toBe('14:00');
  });
});

describe('salida contra la que se mide el H-5', () => {
  const escala = (calzos: string, now: string, extra = {}) => computeDoorAlert({
    aircraftModel: 'A320',
    departureTime: '14:00',
    chocksOnArrival: calzos,
    turnaroundMinutes: 40,
    cargoDoorsClosed: null,
    flightDate: new Date('2026-08-16T14:00:00'),
    now: new Date(`2026-08-16T${now}:00`),
    ...extra,
  });

  it('llegando tarde el límite se corre a calzos + escala', () => {
    // Calza a las 13:50 con 40 min de escala: sale a las 14:30, no a las 14:00.
    const a = escala('13:50', '14:00');
    expect(a.departureLabel).toBe('14:30');
    expect(a.basedOnGroundTime).toBe(true);
    // A las 14:00 faltan 30 min: antes esto ya gritaba "fuera de normativa".
    expect(a.level).toBe('off');
  });

  it('el aviso llega a su hora sobre la salida recalculada', () => {
    const a = escala('13:50', '14:20'); // H-10 de las 14:30
    expect(a.level).toBe('urgent');
    expect(a.secondsToDeadline).toBe(300);
  });

  it('llegar pronto no adelanta la salida: manda la prevista', () => {
    // Calza a las 12:30, la escala acaba a las 13:10, pero el vuelo sale a las 14:00.
    const a = escala('12:30', '13:53');
    expect(a.departureLabel).toBe('14:00');
    expect(a.basedOnGroundTime).toBe(false);
    expect(a.level).toBe('urgent');
  });

  it('sin salida prevista el H-5 sale de la escala programada', () => {
    const a = escala('13:50', '14:20', { departureTime: null });
    expect(a.departureLabel).toBe('14:30');
    expect(a.basedOnGroundTime).toBe(true);
    expect(a.level).toBe('urgent');
  });

  it('sin escala programada se sigue midiendo contra la prevista', () => {
    const a = escala('13:50', '13:53', { turnaroundMinutes: null });
    expect(a.departureLabel).toBe('14:00');
    expect(a.basedOnGroundTime).toBe(false);
    expect(a.level).toBe('urgent');
  });
});

describe('cierre registrado', () => {
  it('el fin de carga NO apaga el aviso: son momentos distintos', () => {
    // Cargado pero sin poder cerrar (repostaje): el aviso debe seguir.
    expect(aFaltaDe(7, { cargoDoorsClosed: null }).level).toBe('urgent');
  });

  it('al registrar el cierre se apaga y se guarda el margen', () => {
    const a = aFaltaDe(7, { cargoDoorsClosed: '13:52' });
    expect(a.level).toBe('done');
    // Límite H-5 = 13:55; cerrado a las 13:52 → 3 min de margen.
    expect(a.marginMinutes).toBe(3);
  });

  it('un cierre posterior al límite se refleja como retraso', () => {
    expect(aFaltaDe(2, { cargoDoorsClosed: '13:58' }).marginMinutes).toBe(-3);
  });
});

describe('cuenta atrás mostrada', () => {
  it('cuenta hacia el límite H-5, no hacia la salida', () => {
    // A 7 min de la salida quedan 2 min para el límite.
    expect(aFaltaDe(7).secondsToDeadline).toBe(120);
  });

  it('se muestra en negativo una vez superado', () => {
    expect(formatCountdown(-80)).toBe('-1:20');
    expect(formatCountdown(245)).toBe('4:05');
  });
});

describe('parseClockTime', () => {
  it('una salida de madrugada tras la medianoche es del día siguiente', () => {
    const now = new Date('2026-08-16T23:50:00');
    expect(parseClockTime('00:20', now)!.getDate()).toBe(17);
  });

  it('rechaza lo que no es una hora', () => {
    const now = new Date('2026-08-16T12:00:00');
    expect(parseClockTime('25:00', now)).toBeNull();
    expect(parseClockTime('', now)).toBeNull();
  });
});

describe('escalas que no son de hoy', () => {
  /** La misma escala del 13, consultada tres días después. */
  const terminada = (extra: Partial<Parameters<typeof computeDoorAlert>[0]> = {}) =>
    computeDoorAlert({
      aircraftModel: 'A321',
      departureTime: '14:00',
      chocksOnArrival: '13:00',
      turnaroundMinutes: 40,
      cargoDoorsClosed: null,
      flightDate: new Date('2026-08-13T00:00:00'), // la escala era de otro día
      now: new Date('2026-08-16T09:00:00'),
      ...extra,
    });

  it('una escala de hace días no dispara alarmas falsas', () => {
    expect(terminada().level).toBe('off');
  });

  it('sin fecha de escala tampoco se avisa', () => {
    expect(aFaltaDe(7, { flightDate: null }).level).toBe('off');
  });

  // El cierre registrado es un dato de la escala, no una alarma: se consulta
  // cuando haga falta. Al limitar TODO el aviso a las escalas de hoy se perdía
  // también esta constancia en cuanto la escala dejaba de ser la del día.
  it('el cierre registrado se sigue consultando días después', () => {
    // Límite H-5 = 13:55; cerrado a las 13:52 → 3 min de margen.
    const a = terminada({ cargoDoorsClosed: '13:52' });
    expect(a.level).toBe('done');
    expect(a.marginMinutes).toBe(3);
    expect(a.departureLabel).toBe('14:00');
  });

  it('y un cierre fuera de límite se sigue viendo como retraso', () => {
    expect(terminada({ cargoDoorsClosed: '13:58' }).marginMinutes).toBe(-3);
  });

  it('el margen sale del día de la escala, no del reloj de hoy', () => {
    // Consultada a las 09:00 de otro día: si las horas se colocaran alrededor
    // de "ahora", las 13:52 y las 13:55 caerían en días distintos.
    const a = terminada({ cargoDoorsClosed: '13:52', now: new Date('2026-08-16T23:30:00') });
    expect(a.marginMinutes).toBe(3);
  });

  it('una escala que cruzó la medianoche mide contra la salida del día siguiente', () => {
    // Calza a las 23:50 del 13 y sale a las 00:30 del 14: límite H-5 = 00:25.
    const a = terminada({
      chocksOnArrival: '23:50',
      departureTime: '00:30',
      turnaroundMinutes: null,
      cargoDoorsClosed: '00:20',
    });
    expect(a.departureLabel).toBe('00:30');
    expect(a.marginMinutes).toBe(5);
  });

  it('sin calzos ni salida calculable se deja constancia del cierre sin margen', () => {
    const a = terminada({
      chocksOnArrival: null,
      departureTime: null,
      turnaroundMinutes: null,
      cargoDoorsClosed: '13:52',
    });
    expect(a.level).toBe('done');
    expect(a.marginMinutes).toBeNull();
  });
});
