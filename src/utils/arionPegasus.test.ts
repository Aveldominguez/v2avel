import { describe, it, expect } from 'vitest';
import { matchAirlineByArionName } from './airlineMatch';
import { resolveAircraftModel } from './aircraftTypeMatch';
import { AIRLINES, AIRLINE_PREFIXES } from '@/types/turnaround';
import { getModelsForAirline } from '@/data/aircraftModels';

/**
 * Fila real de scheduled_flights para el vuelo reportado (PC1099, 07/10/2026).
 * ARION escribe la compañía con una errata: PEGAGUS, con G en vez de S.
 */
const FILA = { airline_code: 'PEGAGUS AIRLINES', aircraft_type: '32Q' };

const conCodigo = AIRLINES.map(a => ({ ...a, prefix: AIRLINE_PREFIXES[a.code] ?? '' }));

describe('PC1099: la escala se rellena con la fila tal cual la guarda ARION', () => {
  it('reconoce la aerolínea pese a la errata', () => {
    expect(matchAirlineByArionName(FILA.airline_code, conCodigo)?.code).toBe('PEGASUS');
  });

  it('y con la aerolínea resuelta, el A321 (32Q) entra solo', () => {
    const aerolinea = matchAirlineByArionName(FILA.airline_code, conCodigo)!;
    const modelo = resolveAircraftModel(FILA.aircraft_type, getModelsForAirline(aerolinea.code));
    expect(modelo?.model).toBe('A321');
  });

  it('el otro avión que trae Pegasus a Madrid, el A320 (32N), también', () => {
    expect(resolveAircraftModel('32N', getModelsForAirline('PEGASUS'))?.model).toBe('A320');
  });
});
