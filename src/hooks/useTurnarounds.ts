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
  aircraftModel?: string;
}

const LIST_COLUMNS = 'id,user_id,flight_number,date,airline,times,observations,created_at,updated_at';

const filterLocal = (list: LocalTurnaround[], opts: FetchPageOptions): LocalTurnaround[] => {
  const s = opts.searchFlight?.trim().toUpperCase();
  return list.filter(t => {
    if (opts.dateISO && t.date !== opts.dateISO) return false;
    if (opts.airline && t.airline !== opts.airline) return false;
    if (opts.aircraftModel && (t.times?.aircraftModel as string) !== opts.aircraftModel) return false;
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
      if (opts.aircraftModel) query = query.eq('times->>aircraftModel', opts.aircraftModel);
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

  /** Background sync of recent (last 2 days) user turnarounds into local store. */
  const syncAllToLocal = useCallback(async () => {
    if (!user || !navigator.onLine) return;
    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const cutoff = twoDaysAgo.toISOString().split('T')[0];

      let from = 0;
      const PAGE = 50;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from('turnarounds')
          .select(LIST_COLUMNS)
          .eq('user_id', user.id)
          .gte('date', cutoff)
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

/**
 * Tope de espera para escribir en el servidor.
 *
 * En plataforma pasa mucho que el móvil diga que tiene cobertura y no haya
 * datos de verdad (dentro del avión, en la terminal, al lado de un carro).
 * Ahí la petición no falla: se queda esperando. Sin tope, el guardado no
 * terminaba nunca y la escala se quedaba sólo en el móvil.
 */
const TOPE_GUARDADO_MS = 15_000;

/** Señal que corta la petición pasado el tope. */
const señalDeCorte = (): AbortSignal => {
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    return AbortSignal.timeout(TOPE_GUARDADO_MS);
  }
  // Navegador antiguo: se monta a mano.
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), TOPE_GUARDADO_MS);
  return ctrl.signal;
};

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
          .abortSignal(señalDeCorte())
          .single();
        if (error) throw error;
        const row = data as DbRow;
        localTurnaroundStore.remapId(user.id, localId, row.id);
        localTurnaroundStore.upsert(user.id, dbRowToLocal(row));
        return mapDbToTurnaround(row);
      } catch (err) {
        /*
         * Antes aquí se devolvía la copia local como si se hubiera guardado.
         * El formulario decidía encolar mirando `navigator.onLine`, que dice
         * "sí" en cuanto hay wifi aunque no haya datos: con la escala sin
         * subir, el usuario veía el aviso verde de guardado, se borraba el
         * borrador y la escala se quedaba SOLO en ese móvil, sin que nada la
         * volviera a intentar nunca.
         *
         * Ahora se avisa del fallo. La copia local ya está escrita, y quien
         * llama tiene su propio `catch` que mete la escala en la cola de
         * reintentos y lo dice en pantalla.
         */
        console.warn('[turnarounds] create: el servidor no confirmó', err);
        throw err;
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
          .abortSignal(señalDeCorte())
          .single();
        if (error) throw error;
        const row = data as DbRow;
        localTurnaroundStore.upsert(user.id, dbRowToLocal(row));
        return mapDbToTurnaround(row);
      } catch (err) {
        // Ver el comentario de createTurnaround: no se da por guardado algo
        // que el servidor no ha confirmado.
        console.warn('[turnarounds] update: el servidor no confirmó', err);
        throw err;
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

  /**
   * Abre una escala, diciendo SI LA HA CONFIRMADO con el servidor.
   *
   * Esto último es lo importante. Antes, si la consulta al servidor fallaba
   * —cosa normal en plataforma, con el móvil diciendo que hay cobertura y sin
   * datos de verdad— se devolvía la copia del móvil sin más. Y si esa copia
   * estaba vieja (por ejemplo porque el almacenamiento del móvil está lleno y
   * las escrituras locales fallan en silencio), la escala se abría con menos
   * datos de los que había en el servidor... y el guardado automático la
   * subía así, destruyendo lo bueno.
   *
   * Devolviendo `confirmada` el formulario puede negarse a guardar solo algo
   * que no ha podido contrastar.
   */
  const getTurnaroundById = useCallback(async (
    id: string,
  ): Promise<{ escala: Turnaround | null; confirmada: boolean }> => {
    if (!user) return { escala: null, confirmada: false };

    const local = localTurnaroundStore.get(user.id, id);

    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('turnarounds')
          .select('*')
          .eq('id', id)
          .abortSignal(señalDeCorte())
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const row = data as DbRow;
          localTurnaroundStore.upsert(user.id, dbRowToLocal(row));
          return { escala: mapDbToTurnaround(row), confirmada: true };
        }
        // El servidor contesta y dice que no existe: también es una respuesta
        // firme, y la copia local es lo único que queda.
        return { escala: local ? localToTurnaround(local) : null, confirmada: false };
      } catch (err) {
        console.warn('[turnarounds] getById: el servidor no contestó', err);
      }
    }

    return { escala: local ? localToTurnaround(local) : null, confirmada: false };
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
