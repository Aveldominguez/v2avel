import { describe, it, expect } from 'vitest';
import { nombreCoordinador } from './coordinatorName';

describe('coordinador leído del «breve comentario» de ARION', () => {
  it('acepta los nombres que ARION trae de verdad', () => {
    // Valores reales de un día en MAD.
    expect(nombreCoordinador('FEDERICO')).toBe('FEDERICO');
    expect(nombreCoordinador('IGNACIO')).toBe('IGNACIO');
    expect(nombreCoordinador('Sofia')).toBe('SOFIA');
    expect(nombreCoordinador('  david  ')).toBe('DAVID');
  });

  it('descarta la referencia de carga, que no es una persona', () => {
    expect(nombreCoordinador('2AD015859')).toBeNull();
  });

  it('descarta lo vacío y lo que no cabe en una casilla', () => {
    expect(nombreCoordinador('')).toBeNull();
    expect(nombreCoordinador('   ')).toBeNull();
    expect(nombreCoordinador(null)).toBeNull();
    expect(nombreCoordinador(undefined)).toBeNull();
    expect(nombreCoordinador('ESTE COMENTARIO ES DEMASIADO LARGO PARA SER UN NOMBRE')).toBeNull();
  });

  it('deja un nombre compuesto en una sola línea', () => {
    expect(nombreCoordinador('JOSE   MARIA')).toBe('JOSE MARIA');
  });
});
