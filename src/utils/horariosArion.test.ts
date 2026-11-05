import { describe, it, expect } from 'vitest';
import { extraerHora, horariosDeArion } from './horariosArion';

// Filas reales del A3700/A3701 del 5 de noviembre de 2026.
const LLEGADA = {
  sdt: '05/11/2026 12:05',
  edt: '05/11/2026 12:16',
  etd: '05/11/2026 14:08',
  connection_sdt: '05/11/2026 13:05',
};
const SALIDA = {
  sdt: '05/11/2026 13:05',
  edt: '05/11/2026 14:08',
  etd: '05/11/2026 14:08',
  connection_sdt: '05/11/2026 12:05',
};

describe('horarios que salen en la cabecera', () => {
  it('el caso roto: el STD era la hora de la LLEGADA', () => {
    // La cabecera ponía «STA 12:05 · STD 12:05» con la salida a las 13:05.
    const h = horariosDeArion(LLEGADA, SALIDA);
    expect(h.std).toBe('13:05');
    expect(h.std).not.toBe(h.sta);
  });

  it('la llegada sale de su propia fila', () => {
    const h = horariosDeArion(LLEGADA, SALIDA);
    expect(h.sta).toBe('12:05');
    expect(h.eta).toBe('12:16');
  });

  it('también trae la salida estimada cuando ARION la revisa', () => {
    expect(horariosDeArion(LLEGADA, SALIDA).etd).toBe('14:08');
  });

  it('sin fila de salida vale la conexión de la llegada, que es la salida', () => {
    const h = horariosDeArion(LLEGADA, null);
    expect(h.std).toBe('13:05');
  });

  it('sin nada no se inventa horas', () => {
    expect(horariosDeArion(null, null)).toEqual({ sta: null, eta: null, std: null, etd: null });
  });

  it('lee la hora del formato de ARION y aguanta lo que no lo sea', () => {
    expect(extraerHora('05/11/2026 13:05')).toBe('13:05');
    expect(extraerHora('')).toBeNull();
    expect(extraerHora(null)).toBeNull();
    expect(extraerHora('vaya')).toBeNull();
  });
});
