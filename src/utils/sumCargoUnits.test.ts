import { describe, it, expect } from 'vitest';
import { sumNumericTokens, firstNumericToken } from './sumCargoUnits';

describe('sumNumericTokens', () => {
  it('suma todos los números del texto', () => {
    expect(sumNumericTokens('9BP 3AVI')).toBe(12);
  });

  it('ignora pesos en kg y piezas pc', () => {
    expect(sumNumericTokens('9BP 150KG 2PC')).toBe(9);
  });

  it('vacío y NIL valen 0', () => {
    expect(sumNumericTokens('')).toBe(0);
    expect(sumNumericTokens('NIL')).toBe(0);
  });
});

describe('firstNumericToken (contenido paletizado AKE/AKH)', () => {
  it('devuelve solo el primer número', () => {
    expect(firstNumericToken('9BP')).toBe(9);
    expect(firstNumericToken('23BT')).toBe(23);
    expect(firstNumericToken('9BP 3AVI 150KG')).toBe(9);
  });

  it('salta un peso inicial en kg/pc y coge el siguiente número', () => {
    expect(firstNumericToken('150KG 9BP')).toBe(9);
  });

  it('vacío y NIL valen 0', () => {
    expect(firstNumericToken('')).toBe(0);
    expect(firstNumericToken('NIL')).toBe(0);
  });
});
