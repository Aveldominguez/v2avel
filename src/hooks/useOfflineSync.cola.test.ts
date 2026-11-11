import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Lo que perdió la escala W46831 del 11/11/2026.
 *
 * Dos procesadores de cola a la vez (OfflineSyncRunner y TurnaroundForm) y un
 * cierre de pasada que escribía la cola entera con una foto vieja. El guardado
 * que el operario hacía durante la sincronización se borraba de la cola.
 */

const QUEUE_KEY = 'offline_sync_queue';
type Op = { id: string; type: 'create' | 'update'; turnaroundId?: string; retryCount?: number };

const leer = (): Op[] => JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
const escribir = (q: Op[]) => localStorage.setItem(QUEUE_KEY, JSON.stringify(q));

/** Cómo se cerraba antes: pisar la cola con la foto del principio. */
const cierreViejo = (restantes: Op[]) => escribir(restantes);

/** Cómo se cierra ahora: quitar sólo lo procesado de la cola ACTUAL. */
const cierreNuevo = (hechas: Set<string>, reintentos: Map<string, Op>) => {
  const actual = leer();
  escribir(actual.filter((op) => !hechas.has(op.id)).map((op) => reintentos.get(op.id) ?? op));
};

beforeEach(() => localStorage.clear());

describe('cierre de una pasada de sincronización', () => {
  it('EL FALLO: el cierre viejo borraba el guardado hecho durante la sincronización', () => {
    escribir([{ id: 'vieja', type: 'update', turnaroundId: 'A' }]);
    const foto = leer();                       // el procesador toma su foto
    escribir([...foto, { id: 'horas', type: 'update', turnaroundId: 'A' }]); // el operario guarda
    cierreViejo(foto.filter((o) => o.id !== 'vieja'));  // procesó 'vieja' y escribe su foto
    expect(leer().find((o) => o.id === 'horas')).toBeUndefined();   // ← horas perdidas
  });

  it('el cierre nuevo conserva lo que entró mientras tanto', () => {
    escribir([{ id: 'vieja', type: 'update', turnaroundId: 'A' }]);
    const foto = leer();
    escribir([...foto, { id: 'horas', type: 'update', turnaroundId: 'A' }]);
    cierreNuevo(new Set(['vieja']), new Map());
    const q = leer();
    expect(q).toHaveLength(1);
    expect(q[0].id).toBe('horas');
  });

  it('lo que falló se queda con su reintento, sin tirar lo nuevo', () => {
    escribir([{ id: 'fallida', type: 'update', turnaroundId: 'A' }]);
    const foto = leer();
    escribir([...foto, { id: 'horas', type: 'update', turnaroundId: 'A' }]);
    cierreNuevo(new Set(), new Map([['fallida', { ...foto[0], retryCount: 1 }]]));
    const q = leer();
    expect(q.map((o) => o.id).sort()).toEqual(['fallida', 'horas']);
    expect(q.find((o) => o.id === 'fallida')!.retryCount).toBe(1);
  });

  it('una pasada normal, sin nadie escribiendo, deja la cola vacía', () => {
    escribir([{ id: 'a', type: 'update' }, { id: 'b', type: 'update' }]);
    cierreNuevo(new Set(['a', 'b']), new Map());
    expect(leer()).toEqual([]);
  });
});
