import { describe, it, expect, beforeEach, vi } from 'vitest';
import { escalasSinSubir, esCreacion } from './rescatarPendientes';
import { localTurnaroundStore, type LocalTurnaround } from './turnaroundLocalStore';

const escala = (id: string, extra: Partial<LocalTurnaround> = {}): LocalTurnaround => ({
  id,
  user_id: 'u1',
  flightNumber: 'AZ' + id,
  date: new Date().toISOString().slice(0, 10),
  airline: 'ITA',
  times: {} as never,
  fieldValues: [],
  observations: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...extra,
});

describe('escalas que se quedaron sin subir', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('encuentra las marcadas como pendientes', () => {
    localTurnaroundStore.upsert('u1', escala('a', { _pendingSync: true }));
    localTurnaroundStore.upsert('u1', escala('b', { _pendingSync: false }));
    expect(escalasSinSubir('u1', []).map(t => t.id)).toEqual(['a']);
  });

  it('no repite las que ya están en la cola de reintentos', () => {
    localTurnaroundStore.upsert('u1', escala('a', { _pendingSync: true }));
    localTurnaroundStore.upsert('u1', escala('c', { _pendingSync: true }));
    const ids = escalasSinSubir('u1', [{ type: 'update', turnaroundId: 'a' }]).map(t => t.id);
    expect(ids).toEqual(['c']);
  });

  it('sin nada pendiente no devuelve nada', () => {
    localTurnaroundStore.upsert('u1', escala('b', { _pendingSync: false }));
    expect(escalasSinSubir('u1', [])).toEqual([]);
  });

  it('distingue una escala que el servidor no conoce de una ya creada', () => {
    // Creada sin conexión: su identificador es el que generó el móvil.
    expect(esCreacion(escala('local-1', { _localId: 'local-1' }))).toBe(true);
    // Ya existe en el servidor: el identificador es del servidor.
    expect(esCreacion(escala('server-1', { _localId: 'local-1' }))).toBe(false);
    expect(esCreacion(escala('server-1'))).toBe(false);
  });
});
