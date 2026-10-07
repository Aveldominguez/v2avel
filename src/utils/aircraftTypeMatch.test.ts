import { describe, it, expect } from 'vitest';
import { resolveAircraftModel } from './aircraftTypeMatch';
import { getModelsForAirline } from '@/data/aircraftModels';

const resolver = (aerolinea: string, tipo: string) =>
  resolveAircraftModel(tipo, getModelsForAirline(aerolinea))?.model ?? null;

describe('cruce del tipo de avión de ARION con los modelos de cada aerolínea', () => {
  it('el caso roto: Pegasus con un 737-800, que en su lista es el genérico B737', () => {
    // ARION manda "738"; Pegasus tiene A320, A321 y B737, sin entrada 737-800.
    expect(resolver('PEGASUS', '738')).toBe('B737');
    expect(resolver('PEGASUS', '73H')).toBe('B737');
  });

  it('cuando la aerolínea sí separa el 737-800, se coge ese y no el genérico', () => {
    const models = [{ model: '737-800', label: '737-800' }, { model: 'B737', label: 'B737' }];
    expect(resolveAircraftModel('738', models)?.model).toBe('737-800');
  });

  it('los neos van a su modelo de siempre', () => {
    expect(resolver('PEGASUS', '32N')).toBe('A320');
    expect(resolver('PEGASUS', 'A21N')).toBe('A321');
    expect(resolver('PEGASUS', '32Q')).toBe('A321');
  });

  it('el MAX cae al genérico B737 en una aerolínea que no lo tiene aparte', () => {
    expect(resolver('PEGASUS', '7M8')).toBe('B737');
  });

  it('sigue valiendo el nombre literal, que es como vienen algunos tipos', () => {
    expect(resolver('PEGASUS', 'A320')).toBe('A320');
    expect(resolver('AMAZON', 'B734')).toBe('B734');
  });

  it('no inventa un avión de otra familia', () => {
    // Amazon sólo tiene el 734: un A320 no debe rellenar nada.
    expect(resolver('AMAZON', '320')).toBeNull();
    expect(resolveAircraftModel('XXX', [{ model: 'A320', label: 'A320' }])).toBeNull();
    expect(resolveAircraftModel('', [{ model: 'A320', label: 'A320' }])).toBeNull();
  });
});
