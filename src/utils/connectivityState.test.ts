import { describe, it, expect } from 'vitest';
import { decideConnectivity, probeIntervalMs, connectivityMessage } from './connectivityState';

describe('decideConnectivity', () => {
  it('sin red del móvil, está sin cobertura', () => {
    expect(decideConnectivity(false, null)).toBe('offline');
    expect(decideConnectivity(false, true)).toBe('offline');
  });

  it('con red y servidor respondiendo, online', () => {
    expect(decideConnectivity(true, true)).toBe('online');
  });

  it('con red pero sin respuesta del servidor, no es "online"', () => {
    // El caso del bloqueo de IP: el móvil tiene 5G y navigator.onLine dice
    // true, pero no llega ni una petición. Antes esto se daba por conectado.
    expect(decideConnectivity(true, false)).toBe('unreachable');
  });

  it('antes de la primera comprobación no se alarma', () => {
    expect(decideConnectivity(true, null)).toBe('online');
  });
});

describe('probeIntervalMs', () => {
  it('sin servidor se pregunta más a menudo que estando bien', () => {
    expect(probeIntervalMs('unreachable')).toBeLessThan(probeIntervalMs('online'));
  });

  it('ningún intervalo es tan corto como para machacar la batería', () => {
    (['online', 'offline', 'unreachable'] as const)
      .forEach(s => expect(probeIntervalMs(s)).toBeGreaterThanOrEqual(20_000));
  });
});

describe('connectivityMessage', () => {
  it('estando bien no molesta', () => {
    expect(connectivityMessage('online')).toBeNull();
  });

  it('distingue quedarse sin cobertura de no llegar al servidor', () => {
    expect(connectivityMessage('offline')!.title).not.toBe(connectivityMessage('unreachable')!.title);
  });

  it('sin servidor sugiere cambiar de wifi a datos, que es lo que lo arregla', () => {
    expect(connectivityMessage('unreachable')!.detail).toMatch(/datos móviles/i);
  });

  it('en ambos casos deja claro que no se pierde lo apuntado', () => {
    (['offline', 'unreachable'] as const)
      .forEach(s => expect(connectivityMessage(s)!.detail).toMatch(/guarda/i));
  });
});
