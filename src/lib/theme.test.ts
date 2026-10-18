import { describe, it, expect, beforeEach } from 'vitest';
import { TEMA_POR_DEFECTO, esTema, igualarTemaDeLaCasa, leerTema } from './theme';

beforeEach(() => localStorage.clear());

describe('tema de la casa', () => {
  it('el de la casa es aero', () => {
    expect(TEMA_POR_DEFECTO).toBe('aero');
  });

  it('quien entra por primera vez lo ve en aero', () => {
    expect(igualarTemaDeLaCasa()).toBe('aero');
    expect(leerTema()).toBe('aero');
  });

  it('a quien venía con otro tema guardado también se le iguala, una vez', () => {
    localStorage.setItem('theme', 'dark');
    expect(igualarTemaDeLaCasa()).toBe('aero');
    expect(leerTema()).toBe('aero');
  });

  it('después se respeta lo que elija: la igualación no se repite', () => {
    igualarTemaDeLaCasa();           // primera vez: queda en aero
    localStorage.setItem('theme', 'sky');  // el usuario elige otro
    expect(igualarTemaDeLaCasa()).toBe('sky');
    expect(igualarTemaDeLaCasa()).toBe('sky');
  });

  it('un valor corrupto no deja la app sin tema', () => {
    localStorage.setItem('theme', 'loquesea');
    expect(leerTema()).toBe('aero');
  });

  it('reconoce los temas válidos y rechaza lo demás', () => {
    expect(esTema('sky')).toBe(true);
    expect(esTema('aero')).toBe(true);
    expect(esTema('neon')).toBe(false);
    expect(esTema(null)).toBe(false);
  });
});
