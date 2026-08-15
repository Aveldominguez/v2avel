import { describe, it, expect } from 'vitest';
import {
  computeDoorAlert, isNarrowBody, formatCountdown, parseDepartureTime,
} from './cargoDoorAlert';

/** `now` a `min` minutos de una salida a las 14:00. */
const aFaltaDe = (min: number, extra: Partial<Parameters<typeof computeDoorAlert>[0]> = {}) => {
  const salida = new Date('2026-08-16T14:00:00');
  return computeDoorAlert({
    aircraftModel: 'A321',
    departureTime: '14:00',
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

  it('sin hora de salida escrita a mano no hay cuenta atrás', () => {
    expect(aFaltaDe(7, { departureTime: null }).level).toBe('off');
    expect(aFaltaDe(7, { departureTime: 'sale ya' }).level).toBe('off');
  });

  it('en escalas de sólo llegada no hay cierre de bodegas', () => {
    expect(aFaltaDe(7, { soloLlegada: true }).level).toBe('off');
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

describe('parseDepartureTime', () => {
  it('una salida de madrugada tras la medianoche es del día siguiente', () => {
    const now = new Date('2026-08-16T23:50:00');
    expect(parseDepartureTime('00:20', now)!.getDate()).toBe(17);
  });

  it('rechaza lo que no es una hora', () => {
    const now = new Date('2026-08-16T12:00:00');
    expect(parseDepartureTime('25:00', now)).toBeNull();
    expect(parseDepartureTime('', now)).toBeNull();
  });
});

describe('escalas que no son de hoy', () => {
  it('una escala de hace días no dispara alarmas falsas', () => {
    const salida = new Date('2026-08-16T14:00:00');
    const a = computeDoorAlert({
      aircraftModel: 'A321',
      departureTime: '14:00',
      cargoDoorsClosed: null,
      flightDate: new Date('2026-08-13T00:00:00'), // la escala era de otro día
      now: new Date(salida.getTime() - 7 * 60_000),
    });
    expect(a.level).toBe('off');
  });

  it('sin fecha de escala tampoco se avisa', () => {
    expect(aFaltaDe(7, { flightDate: null }).level).toBe('off');
  });
});
