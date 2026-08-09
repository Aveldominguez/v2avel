import { describe, it, expect } from 'vitest';
import {
  getCompartmentsByAirline,
  isPairedHold,
  type HoldDefinition,
  type HoldEntry,
} from './compartmentDefinitions';

// Las bodegas pueden venir sueltas o emparejadas izquierda/derecha.
const flatten = (holds: HoldEntry[]): HoldDefinition[] =>
  holds.flatMap((h) => (isPairedHold(h) ? [h.left, h.right] : [h]));

describe('Bodegas del A319 de ITA', () => {
  const comps = getCompartmentsByAirline('ITA', 'A319');

  it('ya no cae en las casillas genéricas: tiene bodegas propias', () => {
    expect(comps.length).toBeGreaterThan(0);
  });

  it('tiene los tres compartimientos reales del avión', () => {
    expect(comps.map((c) => c.compartmentName)).toEqual([
      'COMPARTIMIENTO 1 FWD',
      'COMPARTIMIENTO 4 AFT',
      'Bulk 5 — granel, sin puerta',
    ]);
  });

  it('delante: 12 y 11, con la puerta en la 11', () => {
    expect(flatten(comps[0].holds).map((h) => h.label)).toEqual(['12', '11 🚪']);
  });

  it('detrás: 42 con puerta y 41', () => {
    expect(flatten(comps[1].holds).map((h) => h.label)).toEqual(['42 🚪', '41']);
  });

  it('bulk 51: una sola posición y sin puerta', () => {
    const bulk = flatten(comps[2].holds);
    expect(bulk.map((h) => h.label)).toEqual(['51']);
    expect(bulk[0].label).not.toContain('🚪');
  });

  it('usa el estilo de contenedores de ITA en los compartimientos contenerizados', () => {
    expect(comps[0].holdStyle).toBe('ita');
    expect(comps[1].holdStyle).toBe('ita');
  });

  it('no comparte identificadores con las bodegas del A320', () => {
    const ids = comps.flatMap((c) => flatten(c.holds).map((h) => h.id));
    expect(new Set(ids).size).toBe(ids.length);
    const a320Ids = getCompartmentsByAirline('ITA', 'A320')
      .flatMap((c) => flatten(c.holds).map((h) => h.id));
    expect(ids.some((id) => a320Ids.includes(id))).toBe(false);
  });
});
