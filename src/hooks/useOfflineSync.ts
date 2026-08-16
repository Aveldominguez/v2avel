import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from './useOnlineStatus';
import { useAuth } from './useAuth';
import { TurnaroundTimes, AirlineCode, FieldValue } from '@/types/turnaround';
import { Json } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import { localTurnaroundStore } from '@/lib/turnaroundLocalStore';
import { pruneDrafts, type TurnaroundDraft } from '@/lib/turnaroundDraft';

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
