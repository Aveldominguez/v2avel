import { describe, it, expect } from 'vitest';
import { AIRLINES, getEscalaTimeFields, getTimeFieldsForAirline, getArrivalFields, usesSplitLayout } from '@/types/turnaround';
import { validateTimes } from '@/utils/timeValidation';
import { getEmptyTimes } from '@/hooks/useTurnaroundStore';

const claves = (fs: { key: unknown }[]) => fs.map(f => String(f.key));

/**
 * Norma nueva: a la llegada al parking hay que esperar al walk around del
 * coordinador. Hasta que no da el visto bueno no se pueden abrir bodegas, así
 * que la hora se registra en el bloque de llegada de TODAS las aerolíneas.
 */
describe('VB del coordinador (walk around)', () => {
  it('está en el bloque de llegada de todas las aerolíneas', () => {
    const sinCampo: string[] = [];
    AIRLINES.forEach(a => {
      [false, true].forEach(remoto => {
        const campos = usesSplitLayout(a.code)
          ? claves(getArrivalFields(a.code, remoto))
          : claves(getTimeFieldsForAirline(a.code, remoto));
        if (!campos.includes('coordinatorApproval')) sinCampo.push(`${a.code}${remoto ? ' remoto' : ''}`);
      });
    });
    expect(sinCampo).toEqual([]);
  });

  it('va justo después de los calzos de llegada, antes de la descarga', () => {
    const k = claves(getArrivalFields('TAP', false));
    expect(k.indexOf('coordinatorApproval')).toBe(k.indexOf('chocksOnArrival') + 1);
    expect(k.indexOf('coordinatorApproval')).toBeLessThan(k.indexOf('unloadingStart'));
  });

  it('sale en el PDF de todas las aerolíneas', () => {
    const sinCampo = AIRLINES
      .filter(a => !claves(getEscalaTimeFields(a.code, false)).includes('coordinatorApproval'))
      .map(a => a.code);
    expect(sinCampo).toEqual([]);
  });

  it('se mantiene en modo Sólo llegada', () => {
    expect(claves(getEscalaTimeFields('ITA', false, true, false))).toContain('coordinatorApproval');
  });

  it('avisa si la descarga empieza antes del visto bueno', () => {
    const errores = validateTimes({
      ...getEmptyTimes(), chocksOnArrival: '10:00', coordinatorApproval: '10:05', unloadingStart: '10:02',
    });
    expect(errores.map(e => e.field)).toContain('unloadingStart');
  });

  it('no avisa cuando el orden es el correcto', () => {
    const errores = validateTimes({
      ...getEmptyTimes(), chocksOnArrival: '10:00', coordinatorApproval: '10:05', unloadingStart: '10:08',
    });
    expect(errores).toEqual([]);
  });

  it('no avisa si todavía no hay visto bueno registrado', () => {
    const errores = validateTimes({ ...getEmptyTimes(), chocksOnArrival: '10:00', unloadingStart: '10:08' });
    expect(errores).toEqual([]);
  });

  it('aguanta el cambio de día: calzos a las 23:55 y visto bueno a las 00:05', () => {
    const errores = validateTimes({
      ...getEmptyTimes(), chocksOnArrival: '23:55', coordinatorApproval: '00:05', unloadingStart: '00:10',
    });
    expect(errores).toEqual([]);
  });
});
