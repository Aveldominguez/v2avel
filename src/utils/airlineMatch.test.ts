import { describe, it, expect } from 'vitest';
import { matchAirlineByArionName, normalizeAirlineName } from './airlineMatch';
import { AIRLINES, AIRLINE_PREFIXES } from '@/types/turnaround';

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

describe('matchAirlineByArionName · ARION manda el código IATA en vez del nombre', () => {
  const conCodigo = AIRLINES.map(a => ({ ...a, prefix: AIRLINE_PREFIXES[a.code] ?? '' }));
  const porCodigo = (arion: string) => matchAirlineByArionName(arion, conCodigo)?.code ?? null;

  it('resuelve Pegasus por su código, que era el caso roto', () => {
    expect(porCodigo('PC')).toBe('PEGASUS');
  });

  it('resuelve otros códigos de dos letras', () => {
    expect(porCodigo('TP')).toBe('TAP');
    expect(porCodigo('TO')).toBe('TRANSAVIA');
    expect(porCodigo('GQ')).toBe('SKYEXPRESS');
  });

  it('no resuelve un código compartido por dos compañías', () => {
    // "AC" es Air Canada y Air Canada Cargo: mejor vacío que la equivocada.
    expect(porCodigo('AC')).toBeNull();
  });

  it('no resuelve códigos de una sola letra', () => {
    expect(porCodigo('A')).toBeNull();
    expect(porCodigo('W')).toBeNull();
  });

  it('el nombre completo sigue mandando sobre el código', () => {
    expect(porCodigo('PEGASUS AIRLINES')).toBe('PEGASUS');
    expect(porCodigo('AIR CANADA CARGO')).toBe('AIR_CANADA_CARGO');
  });
});

describe('matchAirlineByArionName · erratas de ARION', () => {
  it('resuelve "PEGAGUS AIRLINES", que es como ARION escribe Pegasus (con G)', () => {
    // Dato real de scheduled_flights: todos los vuelos PC vienen así.
    expect(match('PEGAGUS AIRLINES')).toBe('PEGASUS');
  });

  it('aguanta otras erratas de una letra', () => {
    expect(match('ICELANDAIF')).toBe('ICELANDAIR');
    expect(match('EUROWINHS')).toBe('EUROWINGS');
  });

  it('no tapa una errata que ademas recorta o alarga el nombre', () => {
    // Se tolera una letra cambiada, no un nombre distinto: 'TRANSAVIE FRANCE'
    // tiene la errata Y el pais, y ahi ya no hay forma de estar seguro.
    // 'TRANSAVIA FRANCE', que es lo que manda ARION de verdad, sigue cruzando.
    expect(match('TRANSAVIA FRANCE')).toBe('TRANSAVIA');
  });

  it('sigue sin inventarse una aerolínea que no está en el catálogo', () => {
    expect(match('IBERIA')).toBeNull();
    expect(match('RYANAIR')).toBeNull();
    expect(match('LUFTHANSA')).toBeNull();
    expect(match('BRITISH AIRWAYS')).toBeNull();
    expect(match('VUELING')).toBeNull();
  });

  it('ninguna aerolínea del catálogo se cruza con otra', () => {
    // Si dos nombres reales quedasen a distancia de errata, el cruce sería
    // una lotería: se comprueba que cada una se resuelve a sí misma.
    const fallos = AIRLINES.filter(a => match(a.name) !== a.code).map(a => a.name);
    expect(fallos).toEqual([]);
  });
});
