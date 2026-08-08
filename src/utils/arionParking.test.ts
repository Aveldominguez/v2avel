import { describe, it, expect } from 'vitest';
import { normalizeFlightNumber, flightNumberVariants } from './arionParking';

describe('normalizeFlightNumber', () => {
  it('iguala el mismo vuelo escrito de distintas formas', () => {
    expect(normalizeFlightNumber('AZ 059')).toBe('AZ59');
    expect(normalizeFlightNumber('AZ059')).toBe('AZ59');
    expect(normalizeFlightNumber('AZ59')).toBe('AZ59');
    expect(normalizeFlightNumber('az0059')).toBe('AZ59');
  });

  it('respeta números sin ceros que despistar', () => {
    expect(normalizeFlightNumber('AD8754')).toBe('AD8754');
    expect(normalizeFlightNumber('W64039')).toBe('W64039');
    expect(normalizeFlightNumber('TO4780')).toBe('TO4780');
  });
});

describe('flightNumberVariants', () => {
  it('incluye la forma con y sin ceros a la izquierda', () => {
    const v = flightNumberVariants('AD8754');
    expect(v).toContain('AD8754');
    expect(v).toContain('AD08754');
  });

  it('cubre el caso de ITA, cuyo prefijo acaba en cero', () => {
    const v = flightNumberVariants('AZ0063');
    expect(v).toContain('AZ063');
    expect(v).toContain('AZ63');
  });

  it('no devuelve nada para un número vacío', () => {
    expect(flightNumberVariants('')).toEqual([]);
    expect(flightNumberVariants('   ')).toEqual([]);
  });
});
