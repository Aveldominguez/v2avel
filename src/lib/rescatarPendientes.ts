import { localTurnaroundStore, type LocalTurnaround } from '@/lib/turnaroundLocalStore';

/**
 * Escalas que están guardadas en el móvil y nunca llegaron al servidor.
 *
 * Hasta ahora, un guardado que fallaba por red se daba por bueno: la escala
 * quedaba marcada como pendiente en el móvil y NADA volvía a intentarlo. Esto
 * las busca para meterlas en la cola de reintentos.
 *
 * Se excluye lo que ya esté en la cola, para no mandar dos veces lo mismo.
 */
export interface ColaPendiente {
  type: 'create' | 'update';
  turnaroundId?: string;
}

export const escalasSinSubir = (
  userId: string,
  yaEnCola: ColaPendiente[],
): LocalTurnaround[] => {
  const enCola = new Set(
    yaEnCola.map(op => op.turnaroundId).filter((x): x is string => !!x),
  );
  return localTurnaroundStore
    .list(userId)
    .filter(t => t._pendingSync === true && !enCola.has(t.id));
};

/**
 * ¿Es una escala que el servidor no conoce todavía?
 *
 * Las creadas sin conexión llevan un identificador generado en el móvil, que
 * se guarda en `_localId`. Mientras ese identificador siga siendo el suyo, lo
 * que toca es crearla; si ya tiene uno del servidor, actualizarla.
 */
export const esCreacion = (t: LocalTurnaround): boolean =>
  !!t._localId && t._localId === t.id;
