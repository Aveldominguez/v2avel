import { describe, it, expect } from 'vitest';
import { camposQueSePierden, revisarGuardado } from './guardadoSeguro';

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
