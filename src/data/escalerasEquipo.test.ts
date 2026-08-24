import { describe, it, expect } from 'vitest';
import { getFilteredEquipmentCategories } from './equipmentDefinitions';
import { AIRLINES, airlineUsesStairsAtGate } from '@/types/turnaround';

const hayEscalera = (airline: string, isRemote: boolean) =>
  getFilteredEquipmentCategories(airline, isRemote, 'A320').some(c => c.id === 'ESCALERAS');

describe('escalera en equipos utilizados', () => {
  it('Sky Express la ofrece en parking, no sólo en remoto', () => {
    // El fallo reportado: la escala pide la hora de puesta de escalera pero
    // no dejaba registrar qué escalera se usó.
    expect(airlineUsesStairsAtGate('SKYEXPRESS')).toBe(true);
    expect(hayEscalera('SKYEXPRESS', false)).toBe(true);
  });

  it('las que ya estaban mal ahora la ofrecen en parking', () => {
    ['AEGEAN', 'A_JET', 'SKYUP', 'WESTJET'].forEach(a => {
      expect(hayEscalera(a, false), a).toBe(true);
    });
  });

  it('en remoto la escalera está siempre, use o no escalera en puerta', () => {
    AIRLINES.forEach(a => expect(hayEscalera(a.code, true), a.code).toBe(true));
  });

  it('quien no usa escalera en puerta sigue sin ella en parking', () => {
    // No se cuela en aerolíneas que embarcan por finger y nunca la piden.
    ['WIZZ', 'TRANSAVIA', 'DAN_AIR', 'EUROWINGS', 'CROATIA', 'ICELANDAIR', 'NILE_AIR', 'ALBASTAR']
      .forEach(a => {
        expect(airlineUsesStairsAtGate(a), a).toBe(false);
        expect(hayEscalera(a, false), a).toBe(false);
      });
  });

  it('ninguna aerolínea pide la hora de escalera en parking sin poder registrarla', () => {
    // Esta es la comprobación que impide que las dos listas se vuelvan a
    // desincronizar: recorre TODAS las aerolíneas registradas.
    const incoherentes = AIRLINES
      .filter(a => airlineUsesStairsAtGate(a.code) && !hayEscalera(a.code, false))
      .map(a => a.code);
    expect(incoherentes).toEqual([]);
  });
});
