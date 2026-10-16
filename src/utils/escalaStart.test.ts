import { describe, it, expect } from 'vitest';
import { numeroVueloVisible, puedeContinuar, tieneNumeroReal } from './escalaStart';

const base = {
  flightNumber: '', departureFlightNumber: '', prefijo: 'TP',
  airline: 'TAP', soloSalida: false,
};

describe('empezar una escala', () => {
  it('el caso roto: sólo con el vuelo de salida ya se puede continuar', () => {
    expect(puedeContinuar({ ...base, flightNumber: 'TP', departureFlightNumber: 'TP1019' })).toBe(true);
  });

  it('con el de llegada, como siempre', () => {
    expect(puedeContinuar({ ...base, flightNumber: 'TP1018', departureFlightNumber: 'TP' })).toBe(true);
  });

  it('el prefijo solo no es un número de vuelo', () => {
    expect(puedeContinuar({ ...base, flightNumber: 'TP', departureFlightNumber: 'TP' })).toBe(false);
  });

  it('sin modelo el botón NO se apaga: el modelo se reclama al pulsarlo', () => {
    // Un botón apagado sin explicación es lo que dejó al usuario atascado.
    expect(puedeContinuar({ ...base, flightNumber: 'TP1018' })).toBe(true);
  });

  it('sin aerolínea tampoco', () => {
    expect(puedeContinuar({ ...base, flightNumber: '1018', airline: '', prefijo: '' })).toBe(false);
  });

  it('en sólo salida se continúa sin ningún número, como hasta ahora', () => {
    expect(puedeContinuar({ ...base, soloSalida: true })).toBe(true);
  });

  it('sin aerolínea elegida el campo no lleva prefijo', () => {
    expect(tieneNumeroReal('W61867', '', false)).toBe(true);
    expect(tieneNumeroReal('   ', '', false)).toBe(false);
    expect(tieneNumeroReal('W6', 'W6', true)).toBe(false);
    expect(tieneNumeroReal('W61', 'W6', true)).toBe(true);
  });
});

describe('número que se ve en el historial', () => {
  it('manda el de llegada', () => {
    expect(numeroVueloVisible('TP1018', 'TP1019')).toBe('TP1018');
  });

  it('sin llegada se enseña el de salida, aunque no sea «sólo salida»', () => {
    expect(numeroVueloVisible('', 'TP1019')).toBe('TP1019');
    expect(numeroVueloVisible('   ', 'TP1019')).toBe('TP1019');
  });

  it('sin ninguno, cadena vacía y no «undefined»', () => {
    expect(numeroVueloVisible(null, undefined)).toBe('');
  });
});
