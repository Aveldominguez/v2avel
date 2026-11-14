import { describe, it, expect } from 'vitest';
import { queTiene, resumirCopia, copiasUtiles, type CopiaHistorico } from './resumenRecuperacion';

const copia = (extra: Partial<CopiaHistorico> = {}): CopiaHistorico => ({
  id: 'h1', saved_at: '2026-11-14T10:00:00Z', motivo: 'perdida',
  times: {}, field_values: [], observations: '', extra: null, ...extra,
});

describe('qué se puede recuperar de una copia', () => {
  it('cuenta las horas del operario, no las de ARION', () => {
    const c = copia({ times: {
      chocksOnArrival: '12:30', chocksOff: '13:45',
      scheduledStd: '13:10', scheduledEta: '12:09', departureTime: '13:10',
    }});
    expect(queTiene(c)).toEqual([{ etiqueta: 'horas', cuantos: 2 }]);
  });

  it('cuenta las bodegas con dato, no las casillas vacías', () => {
    const c = copia({ times: { bodegasData: { f1: '12', f2: '', a1: '20', a2: '  ' } } });
    expect(queTiene(c)).toEqual([{ etiqueta: 'bodegas', cuantos: 2 }]);
  });

  it('cuenta los recuentos de maletas rellenos', () => {
    const c = copia({ field_values: [
      { fieldDefinitionId: 'maletas', value: '140' },
      { fieldDefinitionId: 'bf', value: '' },
      { fieldDefinitionId: 'by', value: '90' },
    ]});
    expect(queTiene(c)).toEqual([{ etiqueta: 'recuentos', cuantos: 2 }]);
  });

  it('cuenta personal, equipos y archivos', () => {
    const c = copia({ times: {
      personal: [{ nombre: 'Ana' }],
      equipment: [{ equipmentId: 'a' }, { equipmentId: 'b' }],
      loadingSheetUrls: ['h.jpg'], observationPhotos: ['f1.jpg', 'f2.jpg'],
    }});
    expect(queTiene(c)).toEqual([
      { etiqueta: 'persona', cuantos: 1 },
      { etiqueta: 'equipos', cuantos: 2 },
      { etiqueta: 'archivos', cuantos: 3 },
    ]);
  });

  it('cuenta lo de Air Canada, que vive aparte', () => {
    const c = copia({ extra: { bulk: [{}], loadSheet: [{}, {}, {}] } });
    expect(queTiene(c)).toEqual([
      { etiqueta: 'contadores Air Canada', cuantos: 1 },
      { etiqueta: 'posiciones de LIR', cuantos: 3 },
    ]);
  });

  it('el singular y el plural, bien puestos', () => {
    expect(resumirCopia(copia({ times: { chocksOff: '13:45' } }))).toBe('1 hora');
    expect(resumirCopia(copia({ times: { chocksOff: '13:45', firstBag: '12:10' } }))).toBe('2 horas');
  });

  it('resume varias cosas en una línea', () => {
    const c = copia({
      times: { chocksOff: '13:45', bodegasData: { f1: '12' } },
      field_values: [{ fieldDefinitionId: 'm', value: '140' }],
      observations: 'Sin incidencias',
    });
    expect(resumirCopia(c)).toBe('1 hora · 1 bodega · 1 recuento · observaciones');
  });

  it('una copia vacía lo dice, no finge tener algo', () => {
    expect(resumirCopia(copia())).toBe('sin datos');
  });

  it('aguanta datos corruptos sin reventar', () => {
    expect(() => queTiene(copia({ times: null, field_values: 'no es lista' as never }))).not.toThrow();
    expect(queTiene(copia({ times: null, field_values: null }))).toEqual([]);
  });
});

describe('qué copias se le ofrecen al operario', () => {
  it('fuera las vacías y las de antes de restaurar', () => {
    const utiles = copiasUtiles([
      copia({ id: 'buena', times: { chocksOff: '13:45' } }),
      copia({ id: 'vacia' }),
      copia({ id: 'previa', motivo: 'antes-de-restaurar', times: { chocksOff: '13:45' } }),
    ]);
    expect(utiles.map((c) => c.id)).toEqual(['buena']);
  });

  it('las de Air Canada sí se ofrecen', () => {
    const utiles = copiasUtiles([copia({ id: 'ac', motivo: 'air-canada', extra: { bulk: [{}] } })]);
    expect(utiles.map((c) => c.id)).toEqual(['ac']);
  });
});
