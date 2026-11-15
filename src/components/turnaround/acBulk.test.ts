import { describe, it, expect } from 'vitest';
import { totalBulk } from './AirCanadaCargoScanner';

describe('total de maletas del bulk', () => {
  it('suma todas las casillas', () => {
    expect(totalBulk({ bf: 2, by_val: 5, dom: 1, usa: 3, int_val: 0, bg: 4, rush: 1 })).toBe(16);
  });

  it('sin nada es cero, no «NaN»', () => {
    expect(totalBulk({ bf: 0, by_val: 0, dom: 0, usa: 0, int_val: 0, bg: 0, rush: 0 })).toBe(0);
    expect(totalBulk(null)).toBe(0);
    expect(totalBulk(undefined)).toBe(0);
  });

  it('una casilla sin valor no estropea la suma', () => {
    // Una fila antigua de la base de datos puede traer huecos.
    expect(totalBulk({ bf: 3, by_val: undefined, dom: 2 } as never)).toBe(5);
  });
});

describe('lo que se añade a mano al bulk', () => {
  const base = { bf: 2, by_val: 5, dom: 1, usa: 3, int_val: 0, bg: 4, rush: 1 };

  it('las cantidades sueltas suman al total', () => {
    expect(totalBulk({ ...base, extras: [
      { texto: 'DAA', cantidad: 2, categoria: 'BY' },
      { texto: 'Silla de ruedas', cantidad: 1, categoria: 'BF' },
    ] })).toBe(16 + 3);
  });

  it('sin extras el total es el de siempre', () => {
    expect(totalBulk({ ...base, extras: [] })).toBe(16);
    expect(totalBulk(base)).toBe(16);
  });

  it('una línea a medio rellenar no estropea la cuenta', () => {
    expect(totalBulk({ ...base, extras: [
      { texto: '', cantidad: 0, categoria: 'BF' },
      { texto: 'Caja', cantidad: Number.NaN as never, categoria: 'BG' },
      { texto: 'Bici', cantidad: 1, categoria: 'BG' },
    ] })).toBe(17);
  });
});
