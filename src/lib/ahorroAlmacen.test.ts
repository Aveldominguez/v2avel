import { describe, it, expect, beforeEach } from 'vitest';
import { localTurnaroundStore, type LocalTurnaround } from './turnaroundLocalStore';
import { getAirlineLogo } from './airlineLogoCache';

const USER = 'u1';
/** Un logo de ~27 KB, el tamaño real medido de los que manda ARION. */
const logo = (a: string) => `data:image/png;base64,${a}${'A'.repeat(27 * 1024)}`;

/** 55 escalas de los últimos 40 días repartidas entre 5 aerolíneas. */
const escalas = (): LocalTurnaround[] => Array.from({ length: 55 }, (_, i) => {
  const aero = ['WIZZ', 'ITA', 'TAP', 'ALBASTAR', 'A_JET'][i % 5];
  const d = new Date('2026-09-28');
  d.setDate(d.getDate() - (i % 40));
  return {
    id: `e${i}`, user_id: USER, flightNumber: `W${1000 + i}`,
    date: d.toISOString().slice(0, 10), airline: aero,
    times: { airlineLogo: logo(aero) } as LocalTurnaround['times'],
    fieldValues: [], observations: '',
    createdAt: '2026-09-01T10:00:00Z', updatedAt: '2026-09-01T10:00:00Z',
  };
});

const pesoKB = () => Math.round((localStorage.getItem(`turnarounds_local_v1_${USER}`) || '').length / 1024);

beforeEach(() => localStorage.clear());

describe('el caso real: 55 escalas con logo', () => {
  it('el logo deja de repetirse en cada escala', () => {
    localTurnaroundStore.upsertMany(USER, escalas());
    // Antes cada escala llevaba su copia: 55 × 27 KB ≈ 1,5 MB.
    expect(pesoKB()).toBeLessThan(100);
  });

  it('se guarda un logo por aerolínea, no uno por vuelo', () => {
    localTurnaroundStore.upsertMany(USER, escalas());
    const cache = JSON.parse(localStorage.getItem('airline_logos_v1') || '{}');
    expect(new Set(Object.keys(cache))).toEqual(new Set(['A_JET', 'ALBASTAR', 'ITA', 'TAP', 'WIZZ']));
  });

  it('al leer una escala el logo sigue estando: nada nota el cambio', () => {
    localTurnaroundStore.upsertMany(USER, escalas());
    const e = localTurnaroundStore.get(USER, 'e0');
    expect(e!.times.airlineLogo).toBe(getAirlineLogo('WIZZ'));
    expect(e!.times.airlineLogo).toContain('data:image/png');
  });

  it('las escalas viejas se podan y las pendientes de subir NO', () => {
    const vieja: LocalTurnaround = { ...escalas()[0], id: 'vieja', date: '2026-01-01' };
    const pendiente: LocalTurnaround = { ...escalas()[0], id: 'pend', date: '2026-01-01', _pendingSync: true };
    localTurnaroundStore.upsertMany(USER, [...escalas(), vieja, pendiente]);
    const ids = localTurnaroundStore.list(USER).map(e => e.id);
    expect(ids).not.toContain('vieja');
    expect(ids).toContain('pend');
  });
});

describe('el borrador tampoco arrastra el logo', () => {
  const borrador = (logoData: string | null) => ({
    turnaroundId: 'esc-1', flightNumber: 'W6170', date: '2026-09-28T00:00:00Z',
    airline: 'WIZZ', aircraftModel: 'A321',
    times: { airlineLogo: logoData } as never,
    fieldValues: [], observations: '', tango: 'T21', matricula: 'HALGX',
    isRemote: false, soloLlegada: false, soloSalida: false, remoteLocation: '',
    step: 2, savedAt: Date.now(),
  });

  it('se guarda sin el logo dentro', async () => {
    const { saveDraft } = await import('./turnaroundDraft');
    expect(saveDraft(borrador(logo('WIZZ')))).toBe(true);
    const crudo = localStorage.getItem('turnaround_draft_esc-1') || '';
    // 27 KB de logo no pueden estar dentro del borrador.
    expect(Math.round(crudo.length / 1024)).toBeLessThan(5);
  });

  it('al recuperarlo el logo vuelve a estar', async () => {
    const { saveDraft, loadDraft } = await import('./turnaroundDraft');
    saveDraft(borrador(logo('WIZZ')));
    expect(loadDraft('esc-1')!.times.airlineLogo).toContain('data:image/png');
  });
});
