import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ReviewCheckRow, ReviewMethod, ReviewSessionRow } from '@/types/equipmentReview';

// Las tablas son nuevas y no están en los tipos generados de Supabase todavía.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** Revisión que este dispositivo tiene abierta (puede haber varias en marcha). */
const LOCAL_KEY = 'equipment-review-active-session';

async function currentUser(): Promise<{ id: string | null; name: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { id: null, name: null };
  const { data: prof } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle();
  return { id: user.id, name: prof?.display_name || user.email || null };
}

export interface CategoryConflict {
  session: ReviewSessionRow;
  categoryIds: string[];
}

/**
 * Revisiones de equipos.
 *
 * Pueden convivir varias a la vez siempre que cubran categorías distintas: así
 * un compañero revisa cintas mientras otro revisa tractores. Solo se avisa
 * cuando dos personas van a por la misma categoría, para poder coordinarse.
 * Dentro de una misma revisión el progreso es compartido en tiempo real.
 */
export function useEquipmentReview() {
  const [openSessions, setOpenSessions] = useState<ReviewSessionRow[]>([]);
  const [checksBySession, setChecksBySession] = useState<Record<string, Record<string, ReviewCheckRow>>>({});
  const [activeId, setActiveId] = useState<string | null>(() => {
    try { return localStorage.getItem(LOCAL_KEY); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  /** Motivo real del último fallo, para poder enseñarlo tal cual. */
  const [lastError, setLastError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const { data: s, error } = await db
      .from('equipment_review_sessions')
      .select('*')
      .is('finished_at', null)
      .order('started_at', { ascending: false });

    if (error) {
      setLastError(error.message ?? 'Error desconocido');
      setOpenSessions([]);
      setChecksBySession({});
      setLoading(false);
      return;
    }
    setLastError(null);

    const sessions = (s as ReviewSessionRow[]) ?? [];
    setOpenSessions(sessions);

    if (sessions.length > 0) {
      const { data: c } = await db
        .from('equipment_review_checks')
        .select('*')
        .in('session_id', sessions.map(x => x.id));
      const grouped: Record<string, Record<string, ReviewCheckRow>> = {};
      ((c as ReviewCheckRow[]) ?? []).forEach((row) => {
        (grouped[row.session_id] ??= {})[row.unit_id] = row;
      });
      setChecksBySession(grouped);
    } else {
      setChecksBySession({});
    }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') reload(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, [reload]);

  useEffect(() => {
    const channel = supabase
      .channel('equipment-review-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_review_sessions' }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_review_checks' }, (payload) => {
        const row = payload.new as ReviewCheckRow | undefined;
        const oldRow = payload.old as Partial<ReviewCheckRow> | undefined;
        if (payload.eventType === 'DELETE' && oldRow?.unit_id && oldRow?.session_id) {
          setChecksBySession((prev) => {
            const forSession = { ...(prev[oldRow.session_id!] ?? {}) };
            delete forSession[oldRow.unit_id!];
            return { ...prev, [oldRow.session_id!]: forSession };
          });
        } else if (row?.unit_id) {
          setChecksBySession((prev) => ({
            ...prev,
            [row.session_id]: { ...(prev[row.session_id] ?? {}), [row.unit_id]: row },
          }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [reload]);

  /** La revisión en la que está trabajando este dispositivo. */
  const session = useMemo(
    () => openSessions.find(s => s.id === activeId) ?? null,
    [openSessions, activeId],
  );

  const checks = useMemo(
    () => (session ? checksBySession[session.id] ?? {} : {}),
    [session, checksBySession],
  );

  /** Revisiones abiertas por otros a las que este usuario podría unirse. */
  const otherSessions = useMemo(
    () => openSessions.filter(s => s.id !== activeId),
    [openSessions, activeId],
  );

  const setActive = useCallback((id: string | null) => {
    setActiveId(id);
    try {
      if (id) localStorage.setItem(LOCAL_KEY, id);
      else localStorage.removeItem(LOCAL_KEY);
    } catch { /* almacenamiento no disponible */ }
  }, []);

  /** Cuántos equipos lleva revisados una sesión (para la lista de abiertas). */
  const checkedCountOf = useCallback(
    (sessionId: string) => Object.keys(checksBySession[sessionId] ?? {}).length,
    [checksBySession],
  );

  /**
   * Categorías que ya está revisando otra persona, de entre las solicitadas.
   * Devuelve una entrada por cada revisión abierta que se solape.
   */
  const findConflicts = useCallback((categoryIds: string[]): CategoryConflict[] => {
    return openSessions
      .map((s) => ({
        session: s,
        categoryIds: s.category_ids.filter(id => categoryIds.includes(id)),
      }))
      .filter(c => c.categoryIds.length > 0);
  }, [openSessions]);

  /**
   * Abre una revisión nueva. No comprueba solapes: eso lo decide la pantalla,
   * que ofrece unirse a la revisión existente o quitar las categorías en común.
   */
  const startReview = useCallback(async (categoryIds: string[], unitIdsToClear: string[]) => {
    const { id, name } = await currentUser();

    if (unitIdsToClear.length > 0) {
      const { error: clearErr } = await supabase
        .from('equipment_state')
        .update({ parking: '', battery_level: null, is_charging: false, charging_since: null })
        .eq('is_broken', false)
        .in('unit_id', unitIdsToClear);
      if (clearErr) throw new Error(`No se pudieron vaciar los equipos: ${clearErr.message}`);
    }

    const { data, error } = await db
      .from('equipment_review_sessions')
      .insert({ started_by: id, started_by_name: name, category_ids: categoryIds })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message ?? 'No se pudo crear la revisión');

    const created = data as ReviewSessionRow;
    setOpenSessions(prev => [created, ...prev]);
    setActive(created.id);
    return created;
  }, [setActive]);

  /** Se suma a una revisión que ya está en marcha. */
  const joinSession = useCallback((sessionId: string) => {
    setActive(sessionId);
  }, [setActive]);

  /** Sale de la revisión sin cerrarla para los demás. */
  const leaveSession = useCallback(() => {
    setActive(null);
  }, [setActive]);

  const markChecked = useCallback(async (unitId: string, method: ReviewMethod = 'data') => {
    if (!session) return;
    const { id, name } = await currentUser();
    const row: ReviewCheckRow = {
      session_id: session.id,
      unit_id: unitId,
      checked_at: new Date().toISOString(),
      checked_by: id,
      checked_by_name: name,
      method,
    };
    setChecksBySession(prev => ({
      ...prev,
      [session.id]: { ...(prev[session.id] ?? {}), [unitId]: row },
    }));
    const { error } = await db
      .from('equipment_review_checks')
      .upsert(row, { onConflict: 'session_id,unit_id' });
    if (error) {
      console.error('[revisión] no se pudo marcar el equipo', error);
      setChecksBySession(prev => {
        const forSession = { ...(prev[session.id] ?? {}) };
        delete forSession[unitId];
        return { ...prev, [session.id]: forSession };
      });
      throw new Error(error.message);
    }
  }, [session]);

  const unmarkChecked = useCallback(async (unitId: string) => {
    if (!session) return;
    const previous = checks[unitId];
    setChecksBySession(prev => {
      const forSession = { ...(prev[session.id] ?? {}) };
      delete forSession[unitId];
      return { ...prev, [session.id]: forSession };
    });
    const { error } = await db
      .from('equipment_review_checks')
      .delete()
      .eq('session_id', session.id)
      .eq('unit_id', unitId);
    if (error && previous) {
      setChecksBySession(prev => ({
        ...prev,
        [session.id]: { ...(prev[session.id] ?? {}), [unitId]: previous },
      }));
    }
  }, [session, checks]);

  const finishReview = useCallback(async () => {
    if (!session) return;
    const { id, name } = await currentUser();
    const { error } = await db
      .from('equipment_review_sessions')
      .update({ finished_at: new Date().toISOString(), finished_by: id, finished_by_name: name })
      .eq('id', session.id);
    if (error) throw new Error(error.message);
    setOpenSessions(prev => prev.filter(s => s.id !== session.id));
    setActive(null);
  }, [session, setActive]);

  return {
    loading,
    lastError,
    session,
    checks,
    openSessions,
    otherSessions,
    checkedCountOf,
    findConflicts,
    startReview,
    joinSession,
    leaveSession,
    markChecked,
    unmarkChecked,
    finishReview,
    reload,
  };
}
