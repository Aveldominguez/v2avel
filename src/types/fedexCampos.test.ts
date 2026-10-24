import { describe, it, expect } from 'vitest';
import { getArrivalFields, getDepartureFields, getEscalaTimeFields, usesSplitLayout } from '@/types/turnaround';

const claves = (fs: { key: unknown }[]) => fs.map(f => String(f.key));
const etiqueta = (fs: { key: unknown; label: string }[], k: string) =>
  fs.find(f => String(f.key) === k)?.label;

describe('FedEx: horas repartidas en llegada y salida', () => {
  it('deja de usar la lista única y pasa al reparto en dos bloques', () => {
    expect(usesSplitLayout('FEDEX')).toBe(true);
  });

  it('en llegada van las horas de llegada, y la ristra de llegada', () => {
    const k = claves(getArrivalFields('FEDEX', false));
    ['parkingArrival', 'fedexSuperArrival', 'chocksOnArrival', 'coordinatorApproval',
     'stairsTime', 'unloadingStart', 'unloadingEnd', 'dock1'].forEach(c => expect(k, c).toContain(c));
    // Nada de salida se cuela en el bloque de llegada.
    ['chocksOff', 'loadingStart', 'loadingEnd', 'specialEndLoading', 'ristraDeparture']
      .forEach(c => expect(k, c).not.toContain(c));
  });

  it('en salida van las de salida, con su propia ristra', () => {
    const k = claves(getDepartureFields('FEDEX', false));
    ['loadingStart', 'loadingEnd', 'ristraDeparture', 'specialEndLoading', 'chocksOff', 'asu', 'acu']
      .forEach(c => expect(k, c).toContain(c));
    expect(k).not.toContain('dock1');
  });

  it('la LIR pasa a llamarse Recepción de PDA y sin reediciones', () => {
    const llegada = getArrivalFields('FEDEX', false);
    expect(etiqueta(llegada, 'lirReception')).toBe('Recepción de PDA');
    expect(llegada.find(f => f.key === 'lirReception')?.sinEdiciones).toBe(true);
  });

  it('las dos ristras se distinguen por nombre', () => {
    expect(etiqueta(getArrivalFields('FEDEX', false), 'dock1')).toBe('1ª Ristra Llegada');
    expect(etiqueta(getDepartureFields('FEDEX', false), 'ristraDeparture')).toBe('1ª Ristra Salida');
  });

  it('en «sólo salida» la PDA sigue estando: el avión se trabaja con ella', () => {
    const k = claves(getDepartureFields('FEDEX', false, false, true));
    expect(k).toContain('lirReception');
    expect(etiqueta(getDepartureFields('FEDEX', false, false, true), 'lirReception')).toBe('Recepción de PDA');
  });

  it('en una escala normal la PDA no se repite en salida', () => {
    expect(claves(getDepartureFields('FEDEX', false))).not.toContain('lirReception');
  });

  it('el GPU sólo aparece en remoto', () => {
    expect(claves(getArrivalFields('FEDEX', true))).toContain('gpuOn');
    expect(claves(getArrivalFields('FEDEX', false))).not.toContain('gpuOn');
    expect(claves(getDepartureFields('FEDEX', true))).toContain('gpuOff');
    expect(claves(getDepartureFields('FEDEX', false))).not.toContain('gpuOff');
  });

  it('el PDF exporta exactamente lo que se ve en la escala', () => {
    const escala = new Set([
      ...claves(getArrivalFields('FEDEX', false)),
      ...claves(getDepartureFields('FEDEX', false)),
    ]);
    const pdf = new Set(claves(getEscalaTimeFields('FEDEX', false)));
    expect([...escala].filter(x => !pdf.has(x))).toEqual([]);
  });

  it('y en sólo salida el PDF también lleva la PDA', () => {
    expect(claves(getEscalaTimeFields('FEDEX', false, false, true))).toContain('lirReception');
  });
});
