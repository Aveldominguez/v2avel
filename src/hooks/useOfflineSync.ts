import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from './useOnlineStatus';
import { useAuth } from './useAuth';
import { TurnaroundTimes, AirlineCode, FieldValue } from '@/types/turnaround';
import { Json } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import { localTurnaroundStore } from '@/lib/turnaroundLocalStore';

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
const DRAFT_KEY = 'turnaround_draft';
const MAX_RETRY = 10;

export interface TurnaroundDraft {
  turnaroundId?: string;
  flightNumber: string;
  date: string;
  airline: AirlineCode;
  aircraftModel: string;
  times: TurnaroundTimes;
  fieldValues: FieldValue[];
  observations: string;
  tango: string;
  matricula: string;
  isRemote: boolean;
  soloLlegada: boolean;
  soloSalida: boolean;
  remoteLocation: string;
  step: number;
  savedAt: number;
}

/**
 * Borradores caducados que se pueden tirar para hacer sitio.
 *
 * Un borrador sólo se borra al guardar la escala: cada escala que se abre y se
 * deja a medias deja el suyo para siempre. Con los meses llenan el almacén del
 * navegador (Safari da ~5 MB por web) y a partir de ahí NINGÚN borrador se
 * guarda: es la causa de que se pierda lo apuntado.
 */
const DRAFT_TTL_MS = 48 * 60 * 60 * 1000;

const draftKeys = (): string[] =>
  Object.keys(localStorage).filter((k) => k.startsWith(`${DRAFT_KEY}_`));

/** Tira los borradores más viejos que `olderThanMs`. Devuelve cuántos ha tirado. */
export const pruneDrafts = (olderThanMs = DRAFT_TTL_MS, keep?: string): number => {
  const limite = Date.now() - olderThanMs;
  let tirados = 0;
  for (const k of draftKeys()) {
    if (keep && k === keep) continue;
    try {
      const d = JSON.parse(localStorage.getItem(k) ?? '{}') as Partial<TurnaroundDraft>;
      // Sin fecha se considera de una versión antigua: también sobra.
      if (!d.savedAt || d.savedAt < limite) {
        localStorage.removeItem(k);
        tirados++;
      }
    } catch {
      localStorage.removeItem(k);
      tirados++;
    }
  }
  return tirados;
};

/**
 * Guarda el borrador. Devuelve `false` SÓLO si no ha podido guardarlo ni
 * después de hacer sitio: quien llama debe avisar al usuario, porque a partir
 * de ese momento lo que apunte no está respaldado en el móvil.
 */
export const saveDraft = (draft: TurnaroundDraft): boolean => {
  const key = draft.turnaroundId ? `${DRAFT_KEY}_${draft.turnaroundId}` : `${DRAFT_KEY}_new`;
  const payload = JSON.stringify(draft);
  try {
    localStorage.setItem(key, payload);
    return true;
  } catch (e) {
    console.warn('Failed to save draft:', e);
  }
  // Almacén lleno: se hace sitio tirando borradores viejos y se reintenta,
  // primero los de más de 48 h y, si aún no cabe, todos menos el de esta escala.
  for (const ttl of [DRAFT_TTL_MS, 0]) {
    try {
      if (pruneDrafts(ttl, key) === 0) continue;
      localStorage.setItem(key, payload);
      return true;
    } catch (e) {
      console.warn('Draft still not saved after pruning:', e);
    }
  }
  return false;
};

export const loadDraft = (turnaroundId?: string): TurnaroundDraft | null => {
  try {
    const key = turnaroundId ? `${DRAFT_KEY}_${turnaroundId}` : `${DRAFT_KEY}_new`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const clearDraft = (turnaroundId?: string) => {
  const key = turnaroundId ? `${DRAFT_KEY}_${turnaroundId}` : `${DRAFT_KEY}_new`;
  localStorage.removeItem(key);
};

const getQueue = (): PendingOperation[] => {
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

const saveQueue = (queue: PendingOperation[]): boolean => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch (e) {
    // La cola es lo último que queda cuando falla el guardado en servidor: si
    // tampoco cabe, se hace sitio con los borradores antes de darla por perdida.
    console.warn('No se pudo guardar la cola de sincronización:', e);
    pruneDrafts(0);
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
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
    setPendingCount(getQueue().length);
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
    if (!user || syncingRef.current || !navigator.onLine) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    syncingRef.current = true;
    setSyncing(true);

    let processed = 0;
    const remaining: PendingOperation[] = [];

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
          const { error } = await supabase.from('turnarounds').update({
            flight_number: op.data.flightNumber,
            date: op.data.date,
            airline: op.data.airline,
            times: op.data.times as unknown as Json,
            field_values: fvForDb as unknown as Json,
            observations: op.data.observations,
          }).eq('id', op.turnaroundId);
          if (error) throw error;
          localTurnaroundStore.markSynced(user.id, op.turnaroundId);
        }
        processed++;
      } catch (err) {
        console.error('Sync failed for operation:', op.id, err);
        const retryCount = (op.retryCount || 0) + 1;
        if (retryCount < MAX_RETRY) {
          remaining.push({ ...op, retryCount });
        } else {
          console.error('Dropping op after max retries:', op);
        }
      }
    }

    saveQueue(remaining);
    setPendingCount(remaining.length);
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
      if (navigator.onLine && getQueue().length > 0) processQueue();
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

  return { isOnline, syncing, pendingCount, enqueue, processQueue };
};
