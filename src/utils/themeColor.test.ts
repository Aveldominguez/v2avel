import { describe, it, expect } from 'vitest';
import { hslTokenToHex, parseCssColor, compositeToHex } from './themeColor';

describe('hslTokenToHex', () => {
  it('convierte el blanco de las cabeceras (light, exterior, sky y aero)', () => {
    expect(hslTokenToHex('0 0% 100%')).toBe('#ffffff');
  });

  it('convierte el gris oscuro del tema dark (--card: 222 20% 12%)', () => {
    // Coincide con lo medido en el navegador: rgb(24, 28, 37)
    expect(hslTokenToHex('222 20% 12%')).toBe('#181c25');
  });

  it('tolera espacios de sobra y decimales', () => {
    expect(hslTokenToHex('  0 0% 100%  ')).toBe('#ffffff');
    expect(hslTokenToHex('222 20.0% 12.0%')).toBe('#181c25');
  });

  it('convierte colores saturados de referencia', () => {
    expect(hslTokenToHex('0 100% 50%')).toBe('#ff0000');
    expect(hslTokenToHex('120 100% 50%')).toBe('#00ff00');
    expect(hslTokenToHex('240 100% 50%')).toBe('#0000ff');
    expect(hslTokenToHex('0 0% 0%')).toBe('#000000');
  });

  it('devuelve null si el token no tiene el formato esperado', () => {
    expect(hslTokenToHex('')).toBeNull();
    expect(hslTokenToHex('#ffffff')).toBeNull();
    expect(hslTokenToHex('rgb(255,255,255)')).toBeNull();
    expect(hslTokenToHex('222 20 12')).toBeNull();
  });
});

describe('parseCssColor', () => {
  it('lee colores opacos y con transparencia', () => {
    expect(parseCssColor('rgb(7, 27, 54)')).toEqual([7, 27, 54, 1]);
    expect(parseCssColor('rgba(255, 255, 255, 0.96)')).toEqual([255, 255, 255, 0.96]);
    expect(parseCssColor('rgb(255 255 255 / 0.5)')).toEqual([255, 255, 255, 0.5]);
  });

  it('devuelve null con valores que no son un color rgb', () => {
    expect(parseCssColor('transparent')).toBeNull();
    expect(parseCssColor('#fff')).toBeNull();
    expect(parseCssColor('')).toBeNull();
  });
});

describe('compositeToHex', () => {
  it('un color opaco se queda tal cual', () => {
    expect(compositeToHex([7, 27, 54, 1], [255, 255, 255, 1])).toBe('#071b36');
  });

  it('compone la cabecera al 96% sobre el fondo de la página', () => {
    // Cabecera blanca 96% sobre el navy de Aero: el ojo ve casi blanco
    expect(compositeToHex([255, 255, 255, 0.96], [14, 27, 47, 1])).toBe('#f5f6f7');
  });

  it('la cabecera navy de la escala se mantiene navy', () => {
    expect(compositeToHex([7, 27, 54, 0.96], [14, 27, 47, 1])).toBe('#071b36');
  });

  it('totalmente transparente deja ver el fondo', () => {
    expect(compositeToHex([255, 255, 255, 0], [14, 27, 47, 1])).toBe('#0e1b2f');
  });
});
