import { describe, it, expect } from 'vitest';
import { matchAirlineByArionName, normalizeAirlineName } from './airlineMatch';
import { AIRLINES } from '@/types/turnaround';

const match = (arion: string) => matchAirlineByArionName(arion, AIRLINES)?.code ?? null;

describe('normalizeAirlineName', () => {
  it('quita espacios, puntos y guiones bajos', () => {
    expect(normalizeAirlineName('A Jet')).toBe('AJET');
    expect(normalizeAirlineName('A_JET')).toBe('AJET');
    expect(normalizeAirlineName('Alba Star S.A.')).toBe('ALBASTARSA');
  });
});

describe('matchAirlineByArionName · nombres reales de ARION', () => {
  it('resuelve A Jet, que era el caso roto (ARION escribe "AJET" sin espacio)', () => {
    expect(match('AJET')).toBe('A_JET');
    expect(match('A JET')).toBe('A_JET');
  });

  it('mantiene las aerolíneas que ya funcionaban', () => {
    expect(match('TRANSAVIA FRANCE')).toBe('TRANSAVIA');
    expect(match('AEGEAN AIRLINES SA')).toBe('AEGEAN');
    expect(match('TAP')).toBe('TAP');
    expect(match('ITA')).toBe('ITA');
    expect(match('AIR CANADA')).toBe('AIR_CANADA');
    expect(match('WIZZ AIR MALTA')).toBe('WIZZ');
    expect(match('WIZZ AIR LTD')).toBe('WIZZ');
    expect(match('AZUL BRAZILIAN AIRLI')).toBe('AZUL');
    expect(match('ALBA STAR S.A.')).toBe('ALBASTAR');
  });

  it('no confunde Air Canada con Air Canada Cargo', () => {
    expect(match('AIR CANADA CARGO')).toBe('AIR_CANADA_CARGO');
  });

  it('no inventa una aerolínea cuando el nombre no es de ninguna', () => {
    expect(match('IBERIA')).toBeNull();
    expect(match('RYANAIR')).toBeNull();
    expect(match('')).toBeNull();
  });

  it('no cruza por coincidencias demasiado cortas', () => {
    // "A" o "AC" aparecen dentro de muchos nombres: no deben resolver nada.
    expect(match('A')).toBeNull();
    expect(match('AC')).toBeNull();
  });
});
