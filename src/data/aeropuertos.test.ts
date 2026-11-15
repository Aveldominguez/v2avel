import { describe, it, expect } from 'vitest';
import { nombreDePais, describirAeropuerto, type Aeropuerto } from './aeropuertos';

const mad: Aeropuerto = {
  iata: 'MAD', icao: 'LEMD',
  nombre: 'Adolfo Suárez Madrid–Barajas Airport', ciudad: 'Madrid', pais: 'ES',
};

describe('nombre del país', () => {
  it('lo pone el navegador, en castellano', () => {
    expect(nombreDePais('ES')).toBe('España');
    expect(nombreDePais('IT')).toBe('Italia');
    expect(nombreDePais('TR')).toContain('Turq');
  });

  it('un código que no existe se queda tal cual, no en blanco', () => {
    expect(nombreDePais('XX')).toBe('XX');
  });

  it('un código con formato inválido tampoco revienta', () => {
    expect(nombreDePais('Q1')).toBe('Q1');
  });

  it('sin código no inventa nada', () => {
    expect(nombreDePais('')).toBe('');
  });
});

describe('cómo se describe un aeropuerto', () => {
  it('nombre, ciudad y país', () => {
    expect(describirAeropuerto(mad)).toBe('Adolfo Suárez Madrid–Barajas Airport · Madrid, España');
  });

  it('sin ciudad se queda con el país', () => {
    expect(describirAeropuerto({ ...mad, ciudad: '' })).toBe('Adolfo Suárez Madrid–Barajas Airport · España');
  });

  it('sin ciudad ni país, sólo el nombre: nunca un separador suelto', () => {
    expect(describirAeropuerto({ ...mad, ciudad: '', pais: '' }))
      .toBe('Adolfo Suárez Madrid–Barajas Airport');
  });
});

describe('los datos que se publican', () => {
  it('cada línea tiene sus cinco campos y un IATA de tres letras', async () => {
    const { default: datos } = await import('./aeropuertos.txt?raw');
    const lineas = datos.split('\n');
    expect(lineas.length).toBeGreaterThan(8000);
    for (const l of lineas) {
      const partes = l.split('|');
      expect(partes).toHaveLength(5);
      expect(partes[0]).toMatch(/^[A-Z]{3}$/);
    }
  });

  it('están los aeropuertos que de verdad se usan en LEMD', async () => {
    const { buscarAeropuerto } = await import('./aeropuertos');
    for (const c of ['MAD', 'TRN', 'SAW', 'YUL', 'LIS', 'MXP', 'SVQ']) {
      const a = await buscarAeropuerto(c);
      expect(a, `falta ${c}`).not.toBeNull();
      expect(a!.nombre.length).toBeGreaterThan(3);
    }
  });

  it('un código inventado no revienta', async () => {
    const { buscarAeropuerto } = await import('./aeropuertos');
    expect(await buscarAeropuerto('ZZZ')).toBeNull();
    expect(await buscarAeropuerto('')).toBeNull();
    expect(await buscarAeropuerto(null)).toBeNull();
  });
});
