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

describe('equipaje de tripulación', () => {
  it('no cuenta un número seguido de «crew»', () => {
    expect(sumNumericTokens('8 Crew')).toBe(0);
    expect(sumNumericTokens('8CREW')).toBe(0);
    expect(sumNumericTokens('6 BY 8 crew')).toBe(6);
  });

  it('tampoco cuando «crew» va delante', () => {
    expect(sumNumericTokens('CREW 8')).toBe(0);
    expect(sumNumericTokens('crew bags 8')).toBe(0);
    expect(sumNumericTokens('3 DAA CREW 8')).toBe(3);
  });

  it('sigue contando lo que sólo se parece a crew', () => {
    expect(sumNumericTokens('5 CREWEL')).toBe(5);
    expect(sumNumericTokens('CREWMATE 5')).toBe(5);
  });

  it('un «crew» lejos del número no lo anula', () => {
    expect(sumNumericTokens('CREW EN PUERTA DELANTERA 12')).toBe(12);
  });

  it('la misma regla en las bodegas paletizadas', () => {
    expect(firstNumericToken('8 crew')).toBe(0);
    expect(firstNumericToken('8 crew 6 BY')).toBe(6);
  });
});
