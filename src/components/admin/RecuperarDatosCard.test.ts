import { describe, it, expect } from 'vitest';
import { horasDeVersion } from './RecuperarDatosCard';

describe('horasDeVersion', () => {
  it('saca sólo las horas, con nombre legible y ordenadas', () => {
    const r = horasDeVersion({
      chocksOff: '13:39',
      chocksOnArrival: '12:30',
      tango: 'T22',
      transitBags: '12',
      observationPhotos: ['a.jpg'],
      soloLlegada: false,
      aircraftModel: 'A220',
    });
    expect(r.map(h => h.valor)).toEqual(['12:30', '13:39']);
    expect(r[0].etiqueta).toBe('Calzos Llegada');
  });

  it('una versión sin horas no revienta', () => {
    expect(horasDeVersion(null)).toEqual([]);
    expect(horasDeVersion({})).toEqual([]);
  });

  it('no cuela texto que se parezca a una hora', () => {
    expect(horasDeVersion({ a: '25:00', b: '1:5', c: '12:30' }).map(h => h.valor)).toEqual(['12:30']);
  });
});
