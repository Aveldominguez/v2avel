import { describe, it, expect } from 'vitest';
import { hasRecordedTime, isParkingLocked, decideParkingUpdate } from './parkingLock';

describe('hasRecordedTime', () => {
  it('una hora apuntada por el operario cuenta', () => {
    expect(hasRecordedTime({ chocksOnArrival: '18:42' })).toBe(true);
    expect(hasRecordedTime({ loadingStart: '19:05' })).toBe(true);
    expect(hasRecordedTime({ cargoDoorsClosed: '19:50' })).toBe(true);
  });

  it('las horas que vienen de ARION NO cuentan', () => {
    // La hora de salida se rellena sola: si contara, la escala quedaría
    // fijada nada más abrirla y ARION no llegaría a rellenar el parking.
    expect(hasRecordedTime({
      departureTime: '18:05', scheduledStd: '18:05',
      scheduledArrival: '17:10', scheduledEta: '17:25', scheduledEtd: '18:20',
    })).toBe(false);
  });

  it('una escala en blanco no está fijada', () => {
    expect(hasRecordedTime({})).toBe(false);
    expect(hasRecordedTime(null)).toBe(false);
    expect(hasRecordedTime({ chocksOnArrival: null, tango: 'T22' })).toBe(false);
  });

  it('el parking y el texto de remoto no son horas', () => {
    expect(hasRecordedTime({ tango: '11', remoteLocation: 'Parking 11' })).toBe(false);
  });
});

describe('decideParkingUpdate', () => {
  it('sin parking en la escala, ARION lo rellena', () => {
    expect(decideParkingUpdate('T18', '', {})).toBe('apply');
  });

  it('si coincide no hace nada', () => {
    expect(decideParkingUpdate('T18', 'T18', {})).toBe('ignore');
    expect(decideParkingUpdate('t18', ' T18 ', {})).toBe('ignore');
  });

  it('si difiere lo propone, nunca lo sobrescribe solo', () => {
    expect(decideParkingUpdate('T18', '11', {})).toBe('suggest');
  });

  it('el caso real: con calzos puestos, ARION deja de mandar', () => {
    // Avión llevado al remoto 11 mientras ARION insiste en T18.
    expect(decideParkingUpdate('T18', '11', { chocksOnArrival: '18:42' })).toBe('ignore');
  });

  it('cualquier hora registrada fija la escala, no sólo los calzos', () => {
    expect(decideParkingUpdate('T18', '11', { unloadingStart: '18:50' })).toBe('ignore');
    expect(decideParkingUpdate('T18', '11', { gpuOn: '18:45' })).toBe('ignore');
  });

  it('sin código de ARION no se toca nada', () => {
    expect(decideParkingUpdate(null, '11', {})).toBe('ignore');
    expect(decideParkingUpdate('', '11', {})).toBe('ignore');
  });

  it('isParkingLocked resume el criterio', () => {
    expect(isParkingLocked({ chocksOnArrival: '18:42' })).toBe(true);
    expect(isParkingLocked({ departureTime: '18:05' })).toBe(false);
  });
});
