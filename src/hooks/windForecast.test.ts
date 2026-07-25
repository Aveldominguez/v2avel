import { describe, it, expect } from 'vitest';
import { getWindAlertLevel, parseTaf, type RawTaf } from './windForecast';

describe('getWindAlertLevel', () => {
  it('sin alerta por debajo de 25 kt', () => {
    expect(getWindAlertLevel(15, null)).toBeNull();
    expect(getWindAlertLevel(24, null)).toBeNull();
  });

  it('PRECAUCION entre 25 y 39 kt', () => {
    expect(getWindAlertLevel(25, null)).toBe('PRECAUCION');
    expect(getWindAlertLevel(20, 30)).toBe('PRECAUCION');
  });

  it('RESTRICCION entre 40 y 59 kt', () => {
    expect(getWindAlertLevel(40, null)).toBe('RESTRICCION');
    expect(getWindAlertLevel(20, 45)).toBe('RESTRICCION');
  });

  it('SUSPENSION a partir de 60 kt', () => {
    expect(getWindAlertLevel(60, null)).toBe('SUSPENSION');
    expect(getWindAlertLevel(10, 65)).toBe('SUSPENSION');
  });

  it('usa el mayor entre viento sostenido y rachas', () => {
    expect(getWindAlertLevel(65, 20)).toBe('SUSPENSION');
    expect(getWindAlertLevel(10, 10)).toBeNull();
  });
});

// TAF real de LEMD (25/07/2026 09:59Z), con un tramo TEMPO de rachas 30kt:
// "TEMPO 2514/2520 34016G30KT" — debe salir como PRECAUCION (25-39kt).
const SAMPLE_TAF: RawTaf = {
  rawTAF: 'TAF AMD LEMD 250959Z 2509/2612 VRB05KT CAVOK TX29/2516Z TN13/2605Z TEMPO 2509/2515 4500 FU BECMG 2512/2514 32007KT TEMPO 2514/2520 34016G30KT PROB30 TEMPO 2514/2519 SHRA FEW060TCU BECMG 2521/2523 03006KT',
  issueTime: '2026-07-25T09:59:00.000Z',
  validTimeFrom: 1784970000,
  validTimeTo: 1785067200,
  fcsts: [
    { timeFrom: 1784970000, timeTo: 1784980800, fcstChange: null, probability: null, wspd: 5, wgst: null },
    { timeFrom: 1784970000, timeTo: 1784991600, fcstChange: 'TEMPO', probability: null, wspd: null, wgst: null },
    { timeFrom: 1784980800, timeTo: 1785013200, fcstChange: 'BECMG', probability: null, wspd: 7, wgst: null },
    { timeFrom: 1784988000, timeTo: 1785009600, fcstChange: 'TEMPO', probability: null, wspd: 16, wgst: 30 },
    { timeFrom: 1784988000, timeTo: 1785006000, fcstChange: 'TEMPO', probability: 30, wspd: null, wgst: null },
    { timeFrom: 1785013200, timeTo: 1785067200, fcstChange: 'BECMG', probability: null, wspd: 6, wgst: null },
  ],
};

describe('parseTaf', () => {
  // "now" = 25/07/2026 10:00 UTC, dentro de la ventana de todos los periodos.
  const NOW = new Date('2026-07-25T10:00:00.000Z').getTime();

  it('ignora periodos sin viento explícito (visibilidad/PROB sin wspd)', () => {
    const result = parseTaf(SAMPLE_TAF, NOW);
    // De los 6 fcsts solo 2 declaran wspd con nivel de alerta (5kt y 7kt no alertan; 16G30 sí).
    expect(result.periodsToday).toHaveLength(1);
  });

  it('detecta el tramo de rachas 30kt como PRECAUCION', () => {
    const result = parseTaf(SAMPLE_TAF, NOW);
    expect(result.worstToday?.level).toBe('PRECAUCION');
    expect(result.worstToday?.speed).toBe(16);
    expect(result.worstToday?.gust).toBe(30);
  });

  it('el periodo detectado tiene las horas correctas', () => {
    const result = parseTaf(SAMPLE_TAF, NOW);
    expect(result.worstToday?.from.toISOString()).toBe('2026-07-25T14:00:00.000Z');
    expect(result.worstToday?.to.toISOString()).toBe('2026-07-25T20:00:00.000Z');
  });

  it('descarta periodos que ya terminaron', () => {
    // "now" muy avanzado, después de que termine el único periodo con alerta.
    const laterNow = new Date('2026-07-25T21:00:00.000Z').getTime();
    const result = parseTaf(SAMPLE_TAF, laterNow);
    expect(result.periodsToday).toHaveLength(0);
    expect(result.worstToday).toBeNull();
  });

  it('sin alerta alguna devuelve worstToday null', () => {
    const calmTaf: RawTaf = {
      ...SAMPLE_TAF,
      fcsts: [{ timeFrom: 1784970000, timeTo: 1785067200, fcstChange: null, probability: null, wspd: 8, wgst: null }],
    };
    const result = parseTaf(calmTaf, NOW);
    expect(result.worstToday).toBeNull();
    expect(result.periodsToday).toHaveLength(0);
  });

  it('elige el nivel más severo cuando hay varios tramos de alerta', () => {
    const multiTaf: RawTaf = {
      ...SAMPLE_TAF,
      fcsts: [
        { timeFrom: 1784970000, timeTo: 1784980800, fcstChange: null, probability: null, wspd: 26, wgst: null }, // PRECAUCION
        { timeFrom: 1784988000, timeTo: 1785009600, fcstChange: 'TEMPO', probability: null, wspd: 20, wgst: 65 }, // SUSPENSION
      ],
    };
    const result = parseTaf(multiTaf, NOW);
    expect(result.worstToday?.level).toBe('SUSPENSION');
    expect(result.periodsToday).toHaveLength(2);
  });
});
