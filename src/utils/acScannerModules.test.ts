import { describe, it, expect } from 'vitest';
import { decidirModuloAbierto, verModuloLlegada, verModuloSalida } from './acScannerModules';

describe('módulos del escáner de Air Canada según el modo de la escala', () => {
  it('en sólo salida no se enseña la descarga de llegada (el fallo reportado)', () => {
    expect(verModuloLlegada(true)).toBe(false);
    expect(verModuloSalida(false)).toBe(true);
  });

  it('en sólo llegada no se enseña la carga de salida', () => {
    expect(verModuloSalida(true)).toBe(false);
    expect(verModuloLlegada(false)).toBe(true);
  });

  it('en una escala completa se enseñan los dos', () => {
    expect(verModuloLlegada(undefined)).toBe(true);
    expect(verModuloSalida(undefined)).toBe(true);
  });

  it('al marcar sólo salida, lo que estaba abierto pasa a ser la carga', () => {
    expect(decidirModuloAbierto('arrival', false, true)).toBe('departure');
  });

  it('al marcar sólo llegada, pasa a ser la descarga', () => {
    expect(decidirModuloAbierto('departure', true, false)).toBe('arrival');
  });

  it('no se toca lo que el operario tenga abierto si sigue a la vista', () => {
    expect(decidirModuloAbierto('arrival', true, true)).toBe('arrival');
    expect(decidirModuloAbierto('departure', true, true)).toBe('departure');
    expect(decidirModuloAbierto(null, true, true)).toBeNull();
  });
});
