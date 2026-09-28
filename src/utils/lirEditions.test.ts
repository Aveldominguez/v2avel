import { describe, it, expect } from 'vitest';
import {
  visibleLirCount, filledLirEditions, lirEditionLabel, MAX_LIR_EDITIONS,
} from './lirEditions';

describe('lirEditionLabel', () => {
  it('la primera conserva su nombre de siempre', () => {
    expect(lirEditionLabel(1)).toBe('Recepción de LIR');
  });
  it('las siguientes se numeran', () => {
    expect(lirEditionLabel(2)).toBe('LIR Ed. 2');
    expect(lirEditionLabel(5)).toBe('LIR Ed. 5');
  });
});

describe('visibleLirCount', () => {
  it('una escala sin reediciones muestra sólo la primera', () => {
    expect(visibleLirCount({ lirReception: '19:11' })).toBe(1);
    expect(visibleLirCount({})).toBe(1);
    expect(visibleLirCount(null)).toBe(1);
  });

  it('al reabrir la escala se ven las ediciones ya apuntadas', () => {
    expect(visibleLirCount({ lirReception2: '19:40' })).toBe(2);
    expect(visibleLirCount({ lirReception2: '19:40', lirReception3: '20:05' })).toBe(3);
  });

  it('un hueco en medio no esconde las de después', () => {
    // Si la 2 quedó en blanco y la 3 tiene hora, esconder la 2 impediría
    // rellenarla luego.
    expect(visibleLirCount({ lirReception3: '20:05' })).toBe(3);
  });

  it('nunca pasa del máximo', () => {
    const todas = { lirReception2: '1', lirReception3: '2', lirReception4: '3', lirReception5: '4' };
    expect(visibleLirCount(todas)).toBe(MAX_LIR_EDITIONS);
  });
});

describe('filledLirEditions', () => {
  it('lista sólo las que tienen hora, con su número', () => {
    const r = filledLirEditions({ lirReception2: '19:40', lirReception4: '21:00' });
    expect(r.map(x => x.label)).toEqual(['LIR Ed. 2', 'LIR Ed. 4']);
    expect(r.map(x => x.value)).toEqual(['19:40', '21:00']);
  });

  it('sin reediciones no devuelve nada, y no ocupa sitio en el PDF', () => {
    expect(filledLirEditions({ lirReception: '19:11' })).toEqual([]);
    expect(filledLirEditions(null)).toEqual([]);
  });

  it('un campo vacío o con espacios no cuenta', () => {
    expect(filledLirEditions({ lirReception2: '   ' })).toEqual([]);
  });
});
