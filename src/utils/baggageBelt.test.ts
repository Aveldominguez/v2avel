import { describe, it, expect } from 'vitest';
import { parseBaggageBelt, formatBaggageBelt } from './baggageBelt';

describe('parseBaggageBelt', () => {
  it('el caso que reportaste: N617 es sala 6, cinta 17', () => {
    expect(parseBaggageBelt('N617')).toEqual({ sala: '6', cinta: '17' });
  });

  it('funciona con los valores reales de un día completo en MAD', () => {
    // Los 14 valores distintos que devolvió ARION en 34 vuelos.
    const reales = ['I102','I104','I106','I107','I109','N608','N609','N610',
                    'N611','N612','N614','N615','N616','N617'];
    reales.forEach(v => expect(parseBaggageBelt(v), v).not.toBeNull());
    expect(parseBaggageBelt('I102')).toEqual({ sala: '1', cinta: '02' });
    expect(parseBaggageBelt('N608')).toEqual({ sala: '6', cinta: '08' });
  });

  it('la letra da igual: I y N se tratan igual', () => {
    expect(parseBaggageBelt('I617')).toEqual(parseBaggageBelt('N617'));
  });

  it('sin dato no se inventa nada', () => {
    expect(parseBaggageBelt(null)).toBeNull();
    expect(parseBaggageBelt('')).toBeNull();
    expect(parseBaggageBelt('   ')).toBeNull();
  });

  it('un formato que no encaja se descarta en vez de partirlo mal', () => {
    // Más vale no enseñar sala que enseñar una equivocada.
    expect(parseBaggageBelt('N61')).toBeNull();
    expect(parseBaggageBelt('N6178')).toBeNull();
    expect(parseBaggageBelt('SALA 6')).toBeNull();
  });
});

describe('formatBaggageBelt', () => {
  it('se lee tal cual hay que decirlo por radio', () => {
    expect(formatBaggageBelt('N617')).toBe('Sala 6 · Cinta 17');
  });

  it('la cinta pierde el cero de delante', () => {
    expect(formatBaggageBelt('I102')).toBe('Sala 1 · Cinta 2');
  });

  it('sin dato no ocupa sitio en la cabecera', () => {
    expect(formatBaggageBelt(null)).toBeNull();
    expect(formatBaggageBelt('X')).toBeNull();
  });
});
