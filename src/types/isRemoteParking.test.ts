import { describe, it, expect } from 'vitest';
import { isRemoteParking } from './turnaround';

describe('isRemoteParking', () => {
  it('marca como remoto los parkings que ARION publica sin la T', () => {
    // Códigos reales vistos en ARION (LEMD)
    expect(isRemoteParking('14')).toBe(true);
    expect(isRemoteParking('11')).toBe(true);
    expect(isRemoteParking('45')).toBe(true);
    expect(isRemoteParking('9')).toBe(true);
  });

  it('no marca como remoto los parkings de terminal con T', () => {
    expect(isRemoteParking('T1')).toBe(false);
    expect(isRemoteParking('T14')).toBe(false);
    expect(isRemoteParking('T17')).toBe(false);
    expect(isRemoteParking('T18')).toBe(false);
  });

  it('exceptúa los parkings 70-74: son de terminal con finger aunque no lleven T', () => {
    expect(isRemoteParking('70')).toBe(false);
    expect(isRemoteParking('71')).toBe(false);
    expect(isRemoteParking('72')).toBe(false);
    expect(isRemoteParking('73')).toBe(false);
    expect(isRemoteParking('74')).toBe(false);
  });

  it('los vecinos del grupo exento sí son remotos', () => {
    expect(isRemoteParking('69')).toBe(true);
    expect(isRemoteParking('75')).toBe(true);
    expect(isRemoteParking('7')).toBe(true);
    expect(isRemoteParking('700')).toBe(true);
  });

  it('tolera minúsculas y espacios', () => {
    expect(isRemoteParking('t22')).toBe(false);
    expect(isRemoteParking(' T 22 ')).toBe(false);
    expect(isRemoteParking(' 22 ')).toBe(true);
  });

  it('devuelve null cuando no hay código, para no tocar el interruptor', () => {
    expect(isRemoteParking('')).toBeNull();
    expect(isRemoteParking('   ')).toBeNull();
    expect(isRemoteParking(null)).toBeNull();
    expect(isRemoteParking(undefined)).toBeNull();
  });
});
