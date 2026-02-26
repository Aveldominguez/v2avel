import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from './useOnlineStatus';
import { useAuth } from './useAuth';
import { TurnaroundTimes, AirlineCode, FieldValue } from '@/types/turnaround';
import { Json } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';

interface PendingOperation {
  id: string;
  type: 'create' | 'update';
  turnaroundId?: string; // for updates
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
}

const QUEUE_KEY = 'offline_sync_queue';
const DRAFT_KEY = 'turnaround_draft';

// Draft management for auto-save
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
  remoteLocation: string;
  step: number;
  savedAt: number;
}

export const saveDraft = (draft: TurnaroundDraft) => {
  try {
    const key = draft.turnaroundId ? `${DRAFT_KEY}_${draft.turnaroundId}` : `${DRAFT_KEY}_new`;
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (e) {
    console.warn('Failed to save draft:', e);
  }
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

// Queue management
const getQueue = (): PendingOperation[] => {
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveQueue = (queue: PendingOperation[]) => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const useOfflineSync = () => {
  const { isOnline } = useOnlineStatus();
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);

  // Update pending count
  useEffect(() => {
    setPendingCount(getQueue().length);
  }, []);

  const enqueue = useCallback((op: Omit<PendingOperation, 'id' | 'timestamp'>) => {
    const queue = getQueue();
    // For updates, replace existing pending op for same turnaround
    const filtered = op.type === 'update' && op.turnaroundId
      ? queue.filter(q => !(q.type === 'update' && q.turnaroundId === op.turnaroundId))
      : queue;
    
    filtered.push({
      ...op,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    });
    saveQueue(filtered);
    setPendingCount(filtered.length);
  }, []);

  const processQueue = useCallback(async () => {
    if (!user || syncingRef.current) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    syncingRef.current = true;
    setSyncing(true);

    let processed = 0;
    const remaining: PendingOperation[] = [];

    for (const op of queue) {
      try {
        const fieldValuesForDb = op.data.fieldValues.map(fv => ({
          fieldDefinitionId: fv.fieldDefinitionId,
          value: fv.value,
          updatedAt: fv.updatedAt,
          updatedBy: fv.updatedBy,
        }));

        if (op.type === 'create') {
          const { error } = await supabase.from('turnarounds').insert({
            user_id: user.id,
            flight_number: op.data.flightNumber,
            date: op.data.date,
            airline: op.data.airline,
            times: op.data.times as unknown as Json,
            field_values: fieldValuesForDb as unknown as Json,
            observations: op.data.observations,
          });
          if (error) throw error;
        } else if (op.type === 'update' && op.turnaroundId) {
          const { error } = await supabase.from('turnarounds').update({
            flight_number: op.data.flightNumber,
            date: op.data.date,
            airline: op.data.airline,
            times: op.data.times as unknown as Json,
            field_values: fieldValuesForDb as unknown as Json,
            observations: op.data.observations,
          }).eq('id', op.turnaroundId);
          if (error) throw error;
        }
        processed++;
      } catch (err) {
        console.error('Sync failed for operation:', op.id, err);
        remaining.push(op);
      }
    }

    saveQueue(remaining);
    setPendingCount(remaining.length);
    syncingRef.current = false;
    setSyncing(false);

    if (processed > 0) {
      toast({
        title: '✅ Sincronizado',
        description: `${processed} cambio${processed > 1 ? 's' : ''} sincronizado${processed > 1 ? 's' : ''} con el servidor`,
      });
    }
    if (remaining.length > 0) {
      toast({
        title: '⚠️ Sincronización parcial',
        description: `${remaining.length} cambio${remaining.length > 1 ? 's' : ''} pendiente${remaining.length > 1 ? 's' : ''}`,
        variant: 'destructive',
      });
    }
  }, [user]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && user) {
      processQueue();
    }
  }, [isOnline, user, processQueue]);

  return {
    isOnline,
    syncing,
    pendingCount,
    enqueue,
    processQueue,
  };
};
