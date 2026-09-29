import { describe, it, expect } from 'vitest';
import {
  computeFirstBagAlert, FIRST_BAG_DEADLINE_MIN, FIRST_BAG_HEADS_UP_MIN,
} from './firstBagAlert';

const DIA = '2026-09-29';
/** Descarga iniciada a las 21:00; el plazo vence a las 21:10. */
const a = (hora: string, extra: Partial<Parameters<typeof computeFirstBagAlert>[0]> = {}) =>
  computeFirstBagAlert({
    unloadingStart: '21:00',
    firstBag: null,
    flightDate: new Date(`${DIA}T12:00:00`),
    now: new Date(`${DIA}T${hora}:00`),
    ...extra,
  });

describe('cuenta atrás de la primera maleta', () => {
  it('con margen de sobra sólo cuenta', () => {
    expect(a('21:02').level).toBe('running');
    expect(a('21:02').secondsToDeadline).toBe(480);
  });

  it('en los últimos minutos avisa', () => {
    expect(a('21:07').level).toBe('soon');
    expect(a('21:09').level).toBe('soon');
  });

  it('pasado el plazo queda fuera de norma, en negativo', () => {
    expect(a('21:11').level).toBe('late');
    expect(a('21:11').secondsToDeadline).toBe(-60);
  });

  it('el plazo son 10 minutos y el preaviso 3', () => {
    expect(FIRST_BAG_DEADLINE_MIN).toBe(10);
    expect(FIRST_BAG_HEADS_UP_MIN).toBe(3);
  });
});

describe('pitidos', () => {
  it('uno de preaviso a falta de 3 minutos, y sólo en ese minuto', () => {
    expect(a('21:07').beep).toBe('headsUp');
    expect(a('21:08').beep).toBeNull();
    expect(a('21:06').beep).toBeNull();
  });

  it('uno al agotarse el plazo, y luego no insiste', () => {
    expect(a('21:10').beep).toBe('deadline');
    expect(a('21:12').beep).toBeNull();
    expect(a('21:30').beep).toBeNull();
  });
});

describe('maleta ya enviada', () => {
  it('deja constancia de lo que se tardó', () => {
    const r = a('21:30', { firstBag: '21:08' });
    expect(r.level).toBe('done');
    expect(r.elapsedMinutes).toBe(8);
    expect(r.onTime).toBe(true);
  });

  it('marca cuando se pasó del plazo', () => {
    const r = a('21:30', { firstBag: '21:13' });
    expect(r.elapsedMinutes).toBe(13);
    expect(r.onTime).toBe(false);
  });

  it('justo a los 10 minutos cuenta como dentro de plazo', () => {
    expect(a('21:30', { firstBag: '21:10' }).onTime).toBe(true);
  });

  it('se puede consultar días después, sin que nada suene', () => {
    const r = computeFirstBagAlert({
      unloadingStart: '21:00', firstBag: '21:08',
      flightDate: new Date('2026-09-20T12:00:00'),
      now: new Date('2026-09-29T10:00:00'),
    });
    expect(r.level).toBe('done');
    expect(r.elapsedMinutes).toBe(8);
    expect(r.beep).toBeNull();
  });
});

describe('cuándo NO debe aparecer', () => {
  it('sin inicio de descarga no hay nada que contar', () => {
    expect(a('21:05', { unloadingStart: null }).level).toBe('off');
  });

  it('en sólo salida no hay descarga', () => {
    expect(a('21:05', { soloSalida: true }).level).toBe('off');
  });

  it('una escala de hace días no lanza una cuenta atrás en vivo', () => {
    const r = computeFirstBagAlert({
      unloadingStart: '21:00', firstBag: null,
      flightDate: new Date('2026-09-20T12:00:00'),
      now: new Date(`${DIA}T21:05:00`),
    });
    expect(r.level).toBe('off');
    expect(r.beep).toBeNull();
  });

  it('una descarga de hace horas deja de contar', () => {
    expect(a('23:30').level).toBe('off');
  });
});


/** Recorre la escala minuto a minuto y cuenta los pitidos, como en pista. */
describe('los pitidos no se repiten a lo largo de la escala', () => {
  it('suena exactamente uno de preaviso y uno de plazo', () => {
    const dia = '2026-09-29';
    const sonados: string[] = [];
    let ultimo: string | null = null;
    // De 21:00 a 21:30, segundo a segundo.
    for (let s = 0; s <= 30 * 60; s += 1) {
      const now = new Date(`${dia}T21:00:00`);
      now.setSeconds(now.getSeconds() + s);
      const r = computeFirstBagAlert({
        unloadingStart: '21:00', firstBag: null,
        flightDate: new Date(`${dia}T12:00:00`), now,
      });
      if (r.beep && r.beep !== ultimo) { sonados.push(r.beep); ultimo = r.beep; }
      else if (!r.beep) ultimo = null;
    }
    expect(sonados).toEqual(['headsUp', 'deadline']);
  });
});
