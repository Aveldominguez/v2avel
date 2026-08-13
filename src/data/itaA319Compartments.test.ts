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

describe('Bodegas del 737-800 de A Jet', () => {
  const comps = getCompartmentsByAirline('A_JET', '737-800');

  it('tiene los dos compartimientos reales: delantero y trasero', () => {
    expect(comps.map(c => c.compartmentName)).toEqual([
      'COMPARTIMIENTO DELANTERO FWD',
      'COMPARTIMIENTO TRASERO AFT',
    ]);
  });

  it('delante: 1 con puerta, 1B y 2', () => {
    expect(flatten(comps[0].holds).map(h => h.label)).toEqual([
      'Compartimiento 1 🚪', 'Compartimiento 1B', 'Compartimiento 2',
    ]);
  });

  it('detrás: 3, 4 con puerta y 4B (flight kit)', () => {
    expect(flatten(comps[1].holds).map(h => h.label)).toEqual([
      'Compartimiento 3', 'Compartimiento 4 🚪', 'Compartimiento 4B · flight kit',
    ]);
  });

  it('el 737-800 MAX usa exactamente las mismas bodegas', () => {
    const max = getCompartmentsByAirline('A_JET', '737_MAX');
    expect(max.map(c => c.compartmentName)).toEqual(comps.map(c => c.compartmentName));
    expect(max.flatMap(c => flatten(c.holds).map(h => h.id)))
      .toEqual(comps.flatMap(c => flatten(c.holds).map(h => h.id)));
  });

  it('ya no quedan las bodegas sueltas 1/2/3/4 que tenía el MAX', () => {
    const max = getCompartmentsByAirline('A_JET', '737_MAX');
    expect(max.flatMap(c => flatten(c.holds).map(h => h.label))).not.toContain('Bodega 1');
  });

  it('ya no quedan las bodegas 11/12/13 ni 31/32/41/42 copiadas del A320', () => {
    const etiquetas = comps.flatMap(c => flatten(c.holds).map(h => h.label)).join(' ');
    expect(etiquetas).not.toMatch(/Bodega (11|12|13|31|32|41|42|5)\b/);
  });
});

describe('A321 XLR de Sin Marca', () => {
  const comps = getCompartmentsByAirline('SIN_MARCA', 'A321_XLR');

  it('tiene bodegas propias, no cae en las genéricas', () => {
    expect(comps.length).toBeGreaterThan(0);
    const genericas = getCompartmentsByAirline('SIN_MARCA', 'OTHER');
    expect(comps[0].id).not.toBe(genericas[0]?.id);
  });

  it('el compartimiento 3 queda reducido a la bodega 33 por el depósito trasero', () => {
    const c3 = comps.find(c => c.compartmentName.includes('3'));
    expect(flatten(c3!.holds).map(h => h.label)).toEqual(['Bodega 33']);
  });

  it('conserva el resto de bodegas del A321 XLR', () => {
    expect(comps.map(c => c.compartmentName)).toEqual([
      'COMPARTIMIENTO 1 FWD', 'COMPARTIMIENTO 2', 'COMPARTIMIENTO 3 AFT',
      'COMPARTIMIENTO 4', 'Bulk 5',
    ]);
  });

  it('no comparte identificadores con el A321 normal de Sin Marca', () => {
    const ids = comps.flatMap(c => flatten(c.holds).map(h => h.id));
    const a321 = getCompartmentsByAirline('SIN_MARCA', 'A321')
      .flatMap(c => flatten(c.holds).map(h => h.id));
    expect(ids.some(id => a321.includes(id))).toBe(false);
  });
});
