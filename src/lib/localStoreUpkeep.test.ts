import { describe, it, expect } from 'vitest';
import { pruneByAge, LOCAL_KEEP_DAYS } from './localStoreUpkeep';

const hoy = new Date('2026-09-28');

describe('pruneByAge', () => {
  it('conserva las escalas recientes', () => {
    const r = pruneByAge([{ date: '2026-09-27' }, { date: '2026-09-01' }], hoy);
    expect(r).toHaveLength(2);
  });

  it('tira las que ya nadie consulta', () => {
    expect(pruneByAge([{ date: '2026-01-15' }], hoy)).toHaveLength(0);
  });

  it('NUNCA tira una escala sin sincronizar, por vieja que sea', () => {
    // Es trabajo que todavía no ha llegado al servidor: tirarlo lo perdería.
    const r = pruneByAge([{ date: '2025-01-01', _pendingSync: true }], hoy);
    expect(r).toHaveLength(1);
  });

  it('el límite son 45 días', () => {
    expect(LOCAL_KEEP_DAYS).toBe(45);
    expect(pruneByAge([{ date: '2026-08-15' }], hoy)).toHaveLength(1);  // 44 días
    expect(pruneByAge([{ date: '2026-08-13' }], hoy)).toHaveLength(0);  // 46 días
  });

  it('una entrada sin fecha no se conserva por error', () => {
    expect(pruneByAge([{ date: '' }], hoy)).toHaveLength(0);
  });
});
