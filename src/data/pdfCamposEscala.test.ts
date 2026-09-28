import { describe, it, expect } from 'vitest';
import {
  AIRLINES, getArrivalFields, getDepartureFields, getEscalaTimeFields,
  getTimeFieldsForAirline, usesSplitLayout,
} from '@/types/turnaround';

const claves = (fs: { key: unknown }[]) => fs.map(f => String(f.key));

describe('el PDF exporta los mismos campos que muestra la escala', () => {
  it('el cierre de puertas de bodega sale en el PDF', () => {
    // El fallo reportado: se registraba en la escala pero no se exportaba.
    expect(claves(getEscalaTimeFields('SKYEXPRESS', false))).toContain('cargoDoorsClosed');
    expect(claves(getEscalaTimeFields('WIZZ', true))).toContain('cargoDoorsClosed');
  });

  it('vuelven los campos que el listado heredado se dejaba', () => {
    const k = claves(getEscalaTimeFields('ITA', false));
    ['bagSearchStart', 'bagSearchEnd', 'aviArrival', 'aviDeparture', 'cargoDeparture', 'mailDeparture']
      .forEach(campo => expect(k, campo).toContain(campo));
  });

  it('ninguna aerolínea pierde campos entre la escala y el PDF', () => {
    const desajustes: string[] = [];
    AIRLINES.filter(a => usesSplitLayout(a.code)).forEach(a => {
      [false, true].forEach(remoto => {
        const escala = new Set([
          ...claves(getArrivalFields(a.code, remoto)),
          ...claves(getDepartureFields(a.code, remoto)),
        ]);
        const pdf = new Set(claves(getEscalaTimeFields(a.code, remoto)));
        const faltan = [...escala].filter(x => !pdf.has(x));
        if (faltan.length) desajustes.push(`${a.code}${remoto ? ' remoto' : ''}: ${faltan.join(',')}`);
      });
    });
    expect(desajustes).toEqual([]);
  });

  it('no se repiten filas en el PDF', () => {
    AIRLINES.forEach(a => {
      const k = claves(getEscalaTimeFields(a.code, true));
      expect(new Set(k).size, a.code).toBe(k.length);
    });
  });

  it('sólo llegada deja fuera lo de salida, y al revés', () => {
    const llegada = claves(getEscalaTimeFields('ITA', false, true, false));
    expect(llegada).toContain('chocksOnArrival');
    expect(llegada).not.toContain('cargoDoorsClosed');

    const salida = claves(getEscalaTimeFields('ITA', false, false, true));
    expect(salida).toContain('cargoDoorsClosed');
    expect(salida).not.toContain('chocksOnArrival');
  });

  it('FedEx y Amazon siguen con su listado propio, sin tocar', () => {
    ['FEDEX', 'AMAZON'].forEach(a => {
      expect(claves(getEscalaTimeFields(a, false)))
        .toEqual(claves(getTimeFieldsForAirline(a, false)));
    });
  });
});

describe('reediciones de LIR', () => {
  it('Air Canada ya no tiene el campo suelto "Recibo Nueva LIR"', () => {
    ['AIR_CANADA', 'AIR_CANADA_CARGO'].forEach(a => {
      expect(claves(getEscalaTimeFields(a, false)), a).not.toContain('lirNewReceived');
    });
  });

  it('la recepción de LIR sigue estando en todas las aerolíneas', () => {
    // Es donde vive el botón "+" de las reediciones: si desaparece de alguna,
    // esa aerolínea se queda sin poder registrarlas.
    const sinLir = AIRLINES
      .filter(a => !claves(getEscalaTimeFields(a.code, false)).includes('lirReception'))
      .map(a => a.code);
    expect(sinLir).toEqual([]);
  });
});
