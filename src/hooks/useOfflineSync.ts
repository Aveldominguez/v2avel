import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from './useOnlineStatus';
import { useAuth } from './useAuth';
import { TurnaroundTimes, AirlineCode, FieldValue } from '@/types/turnaround';
import { Json } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import { localTurnaroundStore } from '@/lib/turnaroundLocalStore';
import { pruneDrafts, type TurnaroundDraft } from '@/lib/turnaroundDraft';
import { isBackendReachable, reportBackendFailure } from '@/lib/backendReachability';
import { escalasSinSubir, esCreacion } from '@/lib/rescatarPendientes';

// Se reexportan para no romper a quien ya los importaba desde aquí.
export { saveDraft, loadDraft, clearDraft, pruneDrafts } from '@/lib/turnaroundDraft';
export type { TurnaroundDraft } from '@/lib/turnaroundDraft';

interface PendingOperation {
  id: string;
  type: 'create' | 'update';
  turnaroundId?: string; // for updates — may be a local-generated UUID
  data: {
    flightNumber: string;
    date: string;
    airline: AirlineCode;
    times: TurnaroundTimes;
    fieldValues: Array<{
      fieldDefinitionId: string;
      value: string;
      updatedAt: string;
      updatedBy?: string;
    }>;
    observations: string;
  };
  timestamp: number;
  retryCount?: number;
}

const QUEUE_KEY = 'offline_sync_queue';
const MAX_RETRY = 10;

/**
 * Candado de módulo, NO por componente.
 *
 * `useOfflineSync` se monta dos veces a la vez: en OfflineSyncRunner (global)
 * y en TurnaroundForm (mientras hay una escala abierta). Con un candado por
 * instancia cada copia se creía la única y las dos procesaban la misma cola en
 * paralelo: el 11/11/2026 eso creó cuatro escalas W46831 duplicadas en 41
 * segundos, dos de ellas con 23 ms de diferencia.
 */
let procesandoCola = false;

/**
 * Quita de la cola ACTUAL las operaciones ya procesadas, sin pisar lo que haya
 * entrado mientras tanto.
 *
 * Antes se escribía `saveQueue(remaining)` con la foto de la cola tomada al
 * empezar. Si el operario pulsaba Guardar sin cobertura durante ese rato, su
 * guardado entraba en la cola y acto seguido lo borraba esta escritura. Las
 * horas desaparecían y el aviso decía "✅ Sincronizado".
 */
const cerrarPasada = (hechas: Set<string>, reintentos: Map<string, PendingOperation>) => {
  const actual = getQueue();
  const queda = actual
    .filter((op) => !hechas.has(op.id))
    .map((op) => reintentos.get(op.id) ?? op);
  saveQueue(queda);
  return queda.length;
};

const getQueue = (): PendingOperation[] => {
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

/**
 * Aviso de que la cola ha cambiado.
 *
 * `useOfflineSync` se monta dos veces (el sincronizador global y el
 * formulario de escala) y cada copia tenía su propio contador en memoria.
 * Cuando el global vaciaba la cola, el del formulario no se enteraba y el
 * indicador se quedaba clavado en "1 pendiente" con buena cobertura y para
 * siempre. Ahora todas las copias escuchan el mismo aviso.
 */
const EVENTO_COLA = 'cola-sync-cambiada';
const avisarCambioDeCola = () => {
  try { window.dispatchEvent(new CustomEvent(EVENTO_COLA)); } catch { /* sin ventana */ }
};

const saveQueue = (queue: PendingOperation[]): boolean => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    avisarCambioDeCola();
    return true;
  } catch (e) {
    // Se hace sitio con los borradores CADUCADOS únicamente.
    //
    // Antes aquí se llamaba a pruneDrafts(0), que borra TODOS los borradores
    // incluido el de la escala que el operario está rellenando en ese momento.
    // Eso es tirar justo lo que se intenta salvar: cuando la escala no ha
    // podido subirse, el borrador ES la única copia de las horas.
    console.warn('No se pudo guardar la cola de sincronización:', e);
    pruneDrafts();
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      avisarCambioDeCola();
      return true;
    } catch {
      return false;
    }
  }
};

export const useOfflineSync = () => {
  const { isOnline } = useOnlineStatus();
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);

  useEffect(() => {
    const refrescar = () => setPendingCount(getQueue().length);
    refrescar();
    window.addEventListener(EVENTO_COLA, refrescar);
    // Otra pestaña o la misma app en segundo plano también pueden vaciarla.
    window.addEventListener('storage', refrescar);
    document.addEventListener('visibilitychange', refrescar);
    return () => {
      window.removeEventListener(EVENTO_COLA, refrescar);
      window.removeEventListener('storage', refrescar);
      document.removeEventListener('visibilitychange', refrescar);
    };
  }, []);

  const enqueue = useCallback((op: Omit<PendingOperation, 'id' | 'timestamp'>) => {
    const queue = getQueue();
    let filtered: PendingOperation[];

    if (op.type === 'update' && op.turnaroundId) {
      filtered = queue.filter(q => !(q.type === 'update' && q.turnaroundId === op.turnaroundId));
    } else if (op.type === 'create') {
      filtered = queue.filter(q => !(
        q.type === 'create' &&
        q.data.flightNumber === op.data.flightNumber &&
        q.data.date === op.data.date &&
        q.data.airline === op.data.airline
      ));
    } else {
      filtered = queue;
    }

    filtered.push({
      ...op,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    });
    if (!saveQueue(filtered)) {
      toast({
        title: '⚠️ No se pudo guardar en el móvil',
        description: 'El almacenamiento está lleno. Guarda la escala con conexión antes de cerrar.',
        variant: 'destructive',
      });
      return;
    }
    setPendingCount(filtered.length);
  }, []);

  const processQueue = useCallback(async () => {
    if (!user || procesandoCola || !isBackendReachable()) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    procesandoCola = true;
    syncingRef.current = true;
    setSyncing(true);

    let processed = 0;
    const hechas = new Set<string>();
    const reintentos = new Map<string, PendingOperation>();

    for (const op of queue) {
      try {
        const fvForDb = op.data.fieldValues.map(fv => ({
          fieldDefinitionId: fv.fieldDefinitionId,
          value: fv.value,
          updatedAt: fv.updatedAt,
          updatedBy: fv.updatedBy,
        }));

        if (op.type === 'create') {
          const { data, error } = await supabase.from('turnarounds').insert({
            // La escala se crea CON el id que ya tiene en el móvil. Así, si
            // esta operación se procesa dos veces, la segunda choca con la
            // clave primaria y no crea un duplicado.
            ...(op.turnaroundId ? { id: op.turnaroundId } : {}),
            user_id: user.id,
            flight_number: op.data.flightNumber,
            date: op.data.date,
            airline: op.data.airline,
            times: op.data.times as unknown as Json,
            field_values: fvForDb as unknown as Json,
            observations: op.data.observations,
          }).select('id').single();
          if (error) throw error;
          // Remap local id → server id in local store
          if (op.turnaroundId && data?.id) {
            localTurnaroundStore.remapId(user.id, op.turnaroundId, data.id);
          }
        } else if (op.type === 'update' && op.turnaroundId) {
          const { data: filas, error } = await supabase.from('turnarounds').update({
            flight_number: op.data.flightNumber,
            date: op.data.date,
            airline: op.data.airline,
            times: op.data.times as unknown as Json,
            field_values: fvForDb as unknown as Json,
            observations: op.data.observations,
          }).eq('id', op.turnaroundId).select('id');
          if (error) throw error;
          // PostgREST devuelve error = null cuando el UPDATE no encuentra la
          // fila (id inexistente o filtrada por RLS). Sin esta comprobación la
          // app daba por sincronizado algo que nunca llegó a escribirse, y
          // además lo marcaba como subido, así que el rescate ya no lo miraba.
          if (!filas || filas.length === 0) {
            throw new Error(`La escala ${op.turnaroundId} no existe en el servidor`);
          }
          localTurnaroundStore.markSynced(user.id, op.turnaroundId);
        }
        hechas.add(op.id);
        processed++;
      } catch (err) {
        console.error('Sync failed for operation:', op.id, err);
        reportBackendFailure();
        const retryCount = (op.retryCount || 0) + 1;
        if (retryCount < MAX_RETRY) {
          reintentos.set(op.id, { ...op, retryCount });
        } else {
          console.error('Dropping op after max retries:', op);
          hechas.add(op.id);
        }
      }
    }

    setPendingCount(cerrarPasada(hechas, reintentos));
    procesandoCola = false;
    syncingRef.current = false;
    setSyncing(false);

    if (processed > 0) {
      toast({
        title: '✅ Sincronizado',
        description: `${processed} cambio${processed > 1 ? 's' : ''} sincronizado${processed > 1 ? 's' : ''}`,
      });
    }
  }, [user]);

  // Auto-sync on: online event, visibility change (back to PWA),
  // window focus, and periodic polling. Each is best-effort and
  // guarded by navigator.onLine + an internal `syncingRef` lock.
  useEffect(() => {
    if (!user) return;
    if (isOnline) processQueue();

    const tryProcess = () => {
      if (isBackendReachable() && getQueue().length > 0) processQueue();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tryProcess();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', tryProcess);
    window.addEventListener('focus', tryProcess);

    const interval = setInterval(tryProcess, 30_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', tryProcess);
      window.removeEventListener('focus', tryProcess);
      clearInterval(interval);
    };
  }, [isOnline, user, processQueue]);

  /**
   * Rescate de escalas que se quedaron sólo en el móvil.
   *
   * Hasta ahora un guardado que fallaba por red se daba por bueno y la
   * escala quedaba marcada como pendiente sin que nada la reintentara nunca.
   * Esto las busca al arrancar y las mete en la cola. Hace falta aunque el
   * fallo ya esté corregido: hay escalas atrapadas en los móviles DESDE
   * ANTES, y son las que se dieron por perdidas.
   */
  const rescatarPendientes = useCallback(() => {
    if (!user) return 0;
    const sueltas = escalasSinSubir(user.id, getQueue());
    for (const t of sueltas) {
      enqueue({
        type: esCreacion(t) ? 'create' : 'update',
        turnaroundId: t.id,
        data: {
          flightNumber: t.flightNumber,
          date: t.date,
          airline: t.airline,
          times: t.times,
          fieldValues: t.fieldValues,
          observations: t.observations ?? '',
        },
      });
    }
    if (sueltas.length > 0) {
      console.warn('[sync] rescatadas', sueltas.length, 'escalas que no habían subido');
    }
    return sueltas.length;
  }, [user, enqueue]);

  // Al arrancar y cada vez que vuelve la conexión.
  useEffect(() => {
    if (!user || !isOnline) return;
    const id = setTimeout(() => { rescatarPendientes(); }, 3000);
    return () => clearTimeout(id);
  }, [user, isOnline, rescatarPendientes]);

  return { isOnline, syncing, pendingCount, enqueue, processQueue, rescatarPendientes };
};
