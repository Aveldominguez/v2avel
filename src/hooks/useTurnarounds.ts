import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Turnaround, TurnaroundTimes, AirlineCode, FieldValue } from '@/types/turnaround';
import { Json } from '@/integrations/supabase/types';
import { localTurnaroundStore, LocalTurnaround, localToTurnaround } from '@/lib/turnaroundLocalStore';

type DbRow = {
  id: string;
  user_id: string;
  flight_number: string;
  date: string;
  airline: string;
  times: Json;
  field_values?: Json | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
};

const mapDbToTurnaround = (db: DbRow): Turnaround => {
  const times = db.times as unknown as TurnaroundTimes;
  const fieldValues = (db.field_values as unknown as Array<{
    fieldDefinitionId: string;
    value: string;
    previousValue?: string;
    nilSetAt?: string;
    updatedAt: string;
    updatedBy?: string;
  }>) || [];

  return {
    id: db.id,
    flightNumber: db.flight_number,
    date: new Date(db.date),
    airline: db.airline as AirlineCode,
    times,
    fieldValues: fieldValues.map(fv => ({ ...fv, updatedAt: new Date(fv.updatedAt) })),
    observations: db.observations || '',
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
};

const dbRowToLocal = (db: DbRow): LocalTurnaround => {
  const fv = (db.field_values as unknown as Array<{
    fieldDefinitionId: string; value: string; previousValue?: string;
    nilSetAt?: string; updatedAt: string; updatedBy?: string;
  }>) || [];
  return {
    id: db.id,
    user_id: db.user_id,
    flightNumber: db.flight_number,
    date: db.date,
    airline: db.airline as AirlineCode,
    times: db.times as unknown as TurnaroundTimes,
    fieldValues: fv,
    observations: db.observations || '',
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    _pendingSync: false,
  };
};

export interface FetchPageOptions {
  offset: number;
  limit: number;
  dateISO?: string;
  airline?: AirlineCode;
  searchFlight?: string;
}

const LIST_COLUMNS = 'id,user_id,flight_number,date,airline,times,observations,created_at,updated_at';

const filterLocal = (list: LocalTurnaround[], opts: FetchPageOptions): LocalTurnaround[] => {
  const s = opts.searchFlight?.trim().toUpperCase();
  return list.filter(t => {
    if (opts.dateISO && t.date !== opts.dateISO) return false;
    if (opts.airline && t.airline !== opts.airline) return false;
    if (s) {
      const f = (t.flightNumber || '').toUpperCase();
      const d = ((t.times?.departureFlightNumber as string) || '').toUpperCase();
      if (!f.includes(s) && !d.includes(s)) return false;
    }
    return true;
  });
};

export const useTurnarounds = () => {
  const { user } = useAuth();

  const fetchPage = useCallback(async (opts: FetchPageOptions): Promise<Turnaround[]> => {
    if (!user) return [];

    // Try server first
    try {
      let query = supabase.from('turnarounds').select(LIST_COLUMNS).eq('user_id', user.id);
      if (opts.dateISO) query = query.eq('date', opts.dateISO);
      if (opts.airline) query = query.eq('airline', opts.airline);
      if (opts.searchFlight && opts.searchFlight.trim() !== '') {
        const s = opts.searchFlight.trim().replace(/[%,]/g, '');
        query = query.or(`flight_number.ilike.%${s}%,times->>departureFlightNumber.ilike.%${s}%`);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(opts.offset, opts.offset + opts.limit - 1);

      if (error) throw error;
      const rows = (data || []) as DbRow[];
      // Persist into local store so this page is available offline next time
      localTurnaroundStore.upsertMany(user.id, rows.map(dbRowToLocal));
      // Merge with any pending-local that match filters so they always show up
      const localPending = localTurnaroundStore.list(user.id)
        .filter(t => t._pendingSync);
      const filteredPending = filterLocal(localPending, opts);
      const serverIds = new Set(rows.map(r => r.id));
      const extras = filteredPending.filter(p => !serverIds.has(p.id));
      const merged = [...extras.map(localToTurnaround), ...rows.map(mapDbToTurnaround)];
      return merged;
    } catch (err) {
      console.warn('[turnarounds] offline fallback:', err);
      // Offline: serve from local cache
      const all = localTurnaroundStore.list(user.id);
      const filtered = filterLocal(all, opts);
      const slice = filtered.slice(opts.offset, opts.offset + opts.limit);
      return slice.map(localToTurnaround);
    }
  }, [user]);

  /** Background sync of ALL user turnarounds into local store (for full offline). */
  const syncAllToLocal = useCallback(async () => {
    if (!user || !navigator.onLine) return;
    try {
      let from = 0;
      const PAGE = 50;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from('turnarounds')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const rows = (data || []) as DbRow[];
        if (rows.length === 0) break;
        localTurnaroundStore.upsertMany(user.id, rows.map(dbRowToLocal));
        if (rows.length < PAGE) break;
        from += PAGE;
      }
    } catch (e) {
      console.warn('[turnarounds] syncAllToLocal failed:', e);
    }
  }, [user]);

  const createTurnaround = async (
    flightNumber: string,
    date: Date,
    airline: AirlineCode,
    times: TurnaroundTimes,
    fieldValues: FieldValue[],
    observations: string = ''
  ): Promise<Turnaround | null> => {
    if (!user) return null;

    const fvForDb = fieldValues.map(fv => ({
      fieldDefinitionId: fv.fieldDefinitionId,
      value: fv.value,
      previousValue: fv.previousValue,
      nilSetAt: fv.nilSetAt,
      updatedAt: (fv.updatedAt instanceof Date ? fv.updatedAt : new Date(fv.updatedAt)).toISOString(),
      updatedBy: fv.updatedBy,
    }));

    const dateISO = date.toISOString().split('T')[0];
    const nowISO = new Date().toISOString();
    const localId = crypto.randomUUID();

    // Write to local store first — UI source of truth, works offline.
    localTurnaroundStore.upsert(user.id, {
      id: localId,
      user_id: user.id,
      flightNumber,
      date: dateISO,
      airline,
      times,
      fieldValues: fvForDb,
      observations,
      createdAt: nowISO,
      updatedAt: nowISO,
      _pendingSync: true,
      _localId: localId,
    });

    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('turnarounds')
          .insert({
            user_id: user.id,
            flight_number: flightNumber,
            date: dateISO,
            airline,
            times: times as unknown as Json,
            field_values: fvForDb as unknown as Json,
            observations,
          })
          .select()
          .single();
        if (error) throw error;
        const row = data as DbRow;
        localTurnaroundStore.remapId(user.id, localId, row.id);
        localTurnaroundStore.upsert(user.id, dbRowToLocal(row));
        return mapDbToTurnaround(row);
      } catch (err) {
        console.warn('[turnarounds] create offline-queued:', err);
        // Keep local copy; caller's offline queue will re-attempt.
        const local = localTurnaroundStore.get(user.id, localId)!;
        return localToTurnaround(local);
      }
    }

    const local = localTurnaroundStore.get(user.id, localId)!;
    return localToTurnaround(local);
  };

  const updateTurnaround = async (
    id: string,
    flightNumber: string,
    date: Date,
    airline: AirlineCode,
    times: TurnaroundTimes,
    fieldValues: FieldValue[],
    observations: string = ''
  ): Promise<Turnaround | null> => {
    if (!user) return null;

    const fvForDb = fieldValues.map(fv => ({
      fieldDefinitionId: fv.fieldDefinitionId,
      value: fv.value,
      previousValue: fv.previousValue,
      nilSetAt: fv.nilSetAt,
      updatedAt: (fv.updatedAt instanceof Date ? fv.updatedAt : new Date(fv.updatedAt)).toISOString(),
      updatedBy: fv.updatedBy,
    }));

    const dateISO = date.toISOString().split('T')[0];
    const nowISO = new Date().toISOString();
    const existing = localTurnaroundStore.get(user.id, id);

    // Update local first.
    localTurnaroundStore.upsert(user.id, {
      ...(existing || {} as LocalTurnaround),
      id,
      user_id: user.id,
      flightNumber,
      date: dateISO,
      airline,
      times,
      fieldValues: fvForDb,
      observations,
      createdAt: existing?.createdAt || nowISO,
      updatedAt: nowISO,
      _pendingSync: true,
    });

    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('turnarounds')
          .update({
            flight_number: flightNumber,
            airline,
            times: times as unknown as Json,
            field_values: fvForDb as unknown as Json,
            observations,
          })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        const row = data as DbRow;
        localTurnaroundStore.upsert(user.id, dbRowToLocal(row));
        return mapDbToTurnaround(row);
      } catch (err) {
        console.warn('[turnarounds] update offline-queued:', err);
        const local = localTurnaroundStore.get(user.id, id)!;
        return localToTurnaround(local);
      }
    }

    const local = localTurnaroundStore.get(user.id, id)!;
    return localToTurnaround(local);
  };

  const deleteTurnaround = async (id: string): Promise<boolean> => {
    if (!user) return false;
    localTurnaroundStore.remove(user.id, id);
    try {
      const { error } = await supabase.from('turnarounds').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.warn('[turnarounds] delete will retry online:', err);
    }
    return true;
  };

  const getTurnaroundById = useCallback(async (id: string): Promise<Turnaround | null> => {
    if (!user) return null;

    // Return local immediately if present.
    const local = localTurnaroundStore.get(user.id, id);

    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('turnarounds')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const row = data as DbRow;
          localTurnaroundStore.upsert(user.id, dbRowToLocal(row));
          return mapDbToTurnaround(row);
        }
      } catch (err) {
        console.warn('[turnarounds] getById offline fallback:', err);
      }
    }

    return local ? localToTurnaround(local) : null;
  }, [user]);

  return {
    fetchPage,
    syncAllToLocal,
    createTurnaround,
    updateTurnaround,
    deleteTurnaround,
    getTurnaroundById,
  };
};
