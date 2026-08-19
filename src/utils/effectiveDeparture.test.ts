import { describe, it, expect } from 'vitest';
import { parseClockTime, effectiveDeparture } from './effectiveDeparture';

const now = new Date('2026-08-19T14:00:00');
const hora = (hhmm: string) => parseClockTime(hhmm, now)!;
const label = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('effectiveDeparture', () => {
  it('llegar tarde corre la salida: manda calzos + escala', () => {
    // Prevista 14:00, pero calza a las 13:50 con 40 min de escala.
    const r = effectiveDeparture(hora('14:00'), hora('13:50'), 40)!;
    expect(label(r.salida)).toBe('14:30');
    expect(r.porEscala).toBe(true);
  });

  it('llegar pronto NO adelanta la salida: manda la prevista', () => {
    // La escala acabaría a las 13:10, pero el avión no se va antes de su hora.
    const r = effectiveDeparture(hora('14:00'), hora('12:30'), 40)!;
    expect(label(r.salida)).toBe('14:00');
    expect(r.porEscala).toBe(false);
  });

  it('con una sola de las dos, manda la que haya', () => {
    expect(label(effectiveDeparture(hora('14:00'), null, 40)!.salida)).toBe('14:00');
    expect(label(effectiveDeparture(null, hora('13:50'), 40)!.salida)).toBe('14:30');
  });

  it('sin escala programada no se inventa una salida', () => {
    expect(effectiveDeparture(null, hora('13:50'), null)).toBeNull();
    expect(effectiveDeparture(null, hora('13:50'), 0)).toBeNull();
  });

  it('sin nada que calcular devuelve null', () => {
    expect(effectiveDeparture(null, null, 40)).toBeNull();
  });
});

describe('parseClockTime', () => {
  it('una salida de madrugada tras la medianoche es del día siguiente', () => {
    expect(parseClockTime('00:20', new Date('2026-08-19T23:50:00'))!.getDate()).toBe(20);
  });

  it('unos calzos de anoche vistos de madrugada son de ayer', () => {
    expect(parseClockTime('23:50', new Date('2026-08-19T00:30:00'))!.getDate()).toBe(18);
  });

  it('rechaza lo que no es una hora', () => {
    expect(parseClockTime('25:00', now)).toBeNull();
    expect(parseClockTime('', now)).toBeNull();
  });
});
