import { describe, it, expect } from 'vitest';
import { etiquetaDeHora } from './etiquetasHoras';

describe('etiquetaDeHora', () => {
  it('traduce los campos que ve el operario', () => {
    expect(etiquetaDeHora('chocksOnArrival')).toBe('Calzos Llegada');
  });

  it('cubre las horas del final de la escala', () => {
    for (const k of ['chocksOff', 'cargoDoorsClosed', 'loadingStart', 'unloadingEnd']) {
      expect(etiquetaDeHora(k)).not.toBe(k);
    }
  });

  it('un campo desconocido se enseña tal cual, no en blanco', () => {
    expect(etiquetaDeHora('campoQueNoExiste')).toBe('campoQueNoExiste');
  });
});
