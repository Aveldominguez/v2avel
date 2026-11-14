import { describe, it, expect } from 'vitest';
import { camposQueSePierden, revisarGuardado, tiposQueSeVacian, riqueza } from './guardadoSeguro';

const base = {
  chocksOnArrival: '12:30',
  unloadingStart: '12:34',
  unloadingEnd: '12:49',
  loadingStart: '13:01',
  loadingEnd: '13:28',
  cargoDoorsClosed: '13:30',
  chocksOff: '13:39',
  transitBags: '12',
  // Puestos por ARION, no por el operario:
  scheduledArrival: '12:05',
  scheduledStd: '13:05',
  departureTime: '13:05',
};

describe('guardados que vacían una escala', () => {
  it('el caso de la AZ058: se van todas las horas y sólo queda lo de ARION', () => {
    const v = revisarGuardado(base, {
      scheduledArrival: '12:05', scheduledStd: '13:05', departureTime: '13:05',
    });
    expect(v.peligroso).toBe(true);
    expect(v.perdidos).toContain('chocksOnArrival');
    expect(v.perdidos).toContain('chocksOff');
    expect(v.perdidos).toHaveLength(8);
  });

  it('corregir una hora no es peligroso', () => {
    expect(revisarGuardado(base, { ...base, chocksOff: '13:45' }).peligroso).toBe(false);
  });

  it('borrar UNA hora mal apuntada no es peligroso: pasa todos los días', () => {
    expect(revisarGuardado(base, { ...base, chocksOff: null }).peligroso).toBe(false);
  });

  it('borrar dos tampoco: sigue pareciendo una corrección', () => {
    const v = revisarGuardado(base, { ...base, chocksOff: null, cargoDoorsClosed: null });
    expect(v.perdidos).toHaveLength(2);
    expect(v.peligroso).toBe(false);
  });

  it('tres de golpe ya no es una corrección', () => {
    const v = revisarGuardado(base, {
      ...base, chocksOff: null, cargoDoorsClosed: null, loadingEnd: null,
    });
    expect(v.peligroso).toBe(true);
  });

  it('añadir horas nunca es peligroso', () => {
    const v = revisarGuardado({ chocksOnArrival: '12:30' }, base);
    expect(v.perdidos).toEqual([]);
    expect(v.peligroso).toBe(false);
  });

  it('lo que pone ARION no cuenta: cambia solo y no es trabajo de nadie', () => {
    const v = camposQueSePierden(base, { ...base, scheduledStd: null, departureTime: null, baggageBelt: null });
    expect(v).toEqual([]);
  });

  it('una escala nueva, sin nada guardado antes, no dispara nada', () => {
    expect(revisarGuardado(null, base).peligroso).toBe(false);
    expect(revisarGuardado(undefined, {}).perdidos).toEqual([]);
  });
});

/**
 * Lo que vació la PC1099 el 14/11, dos veces seguidas.
 *
 * Se restauraron los datos y, 8 segundos después, el formulario que seguía
 * abierto con la pantalla vacía los volvió a subir encima. Las horas no
 * cambiaban (18 → 18), así que la comprobación de entonces lo dejaba pasar.
 */
describe('guardados que vacían lo que no son horas', () => {
  const servidor = {
    times: {
      chocksOnArrival: '12:17', chocksOff: '13:34',
      personal: [{ nombre: 'Ana' }, { nombre: 'Luis' }, { nombre: 'Eva' }, { nombre: 'Jon' }],
      equipment: [{ equipmentId: 'a' }, { equipmentId: 'b' }],
      loadingSheetUrls: ['h.jpg'], observationPhotos: ['f.jpg'],
      bodegasData: { f1: '12' },
    },
    fieldValues: [
      { fieldDefinitionId: 'h11', value: '9BY' }, { fieldDefinitionId: 'h12', value: '67PC' },
      { fieldDefinitionId: 'h31', value: '56BT' }, { fieldDefinitionId: 'h41', value: 'NIL' },
      { fieldDefinitionId: 'h51', value: 'NIL' },
    ],
    observations: 'Cinta 8313 con 98%',
  };

  it('el caso exacto: mismas horas, pero todo lo demás a cero', () => {
    const pantallaVacia = {
      times: { chocksOnArrival: '12:17', chocksOff: '13:34' },
      fieldValues: [], observations: '',
    };
    expect(tiposQueSeVacian(servidor, pantallaVacia).sort()).toEqual(
      ['archivos', 'bodegas', 'equipos', 'observaciones', 'personas', 'recuentos'].sort(),
    );
  });

  it('un guardado normal, sin perder nada, no salta', () => {
    expect(tiposQueSeVacian(servidor, servidor)).toEqual([]);
  });

  it('añadir cosas tampoco salta', () => {
    const mas = { ...servidor, observations: 'Otra cosa', times: { ...servidor.times, firstBag: '12:31' } };
    expect(tiposQueSeVacian(servidor, mas)).toEqual([]);
  });

  it('quitar UNA persona de cuatro no es vaciar: eso lo hace el operario', () => {
    const menos = { ...servidor, times: { ...servidor.times, personal: [{ nombre: 'Ana' }] } };
    expect(tiposQueSeVacian(servidor, menos)).toEqual([]);
  });

  it('pero quitarlas TODAS sí', () => {
    const sinNadie = { ...servidor, times: { ...servidor.times, personal: [] } };
    expect(tiposQueSeVacian(servidor, sinNadie)).toEqual(['personas']);
  });

  it('una escala nueva, sin nada en el servidor, no dispara nada', () => {
    expect(tiposQueSeVacian(null, servidor)).toEqual([]);
    expect(tiposQueSeVacian(undefined, { times: {}, fieldValues: [], observations: '' })).toEqual([]);
  });

  it('cuenta bien cada tipo', () => {
    expect(riqueza(servidor)).toEqual({
      horas: 2, bodegas: 1, personal: 4, equipos: 2, adjuntos: 2, campos: 5, observaciones: 1,
    });
  });
});
