import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ReviewCheckRow, ReviewMethod, ReviewSessionRow } from '@/types/equipmentReview';

// La tabla es nueva y no está en los tipos generados de Supabase todavía.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** Nombre legible del usuario para dejar rastro de quién revisó cada equipo. */
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

/**
 * Revisión de equipos compartida entre todos los usuarios: hay como mucho una
 * abierta a la vez y el progreso se propaga en tiempo real, para que dos
 * compañeros puedan repartirse el aeropuerto sin pisarse.
 */
export function useEquipmentReview() {
  const [session, setSession] = useState<ReviewSessionRow | null>(null);
  const [checks, setChecks] = useState<Record<string, ReviewCheckRow>>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data: s } = await db
      .from('equipment_review_sessions')
      .select('*')
      .is('finished_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const active = (s as ReviewSessionRow) ?? null;
    setSession(active);

    if (active) {
      const { data: c } = await db
        .from('equipment_review_checks')
        .select('*')
        .eq('session_id', active.id);
      const map: Record<string, ReviewCheckRow> = {};
      ((c as ReviewCheckRow[]) ?? []).forEach((row) => { map[row.unit_id] = row; });
      setChecks(map);
    } else {
      setChecks({});
    }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Al volver del segundo plano (PWA en iOS congela el websocket) se recarga.
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
        if (payload.eventType === 'DELETE' && oldRow?.unit_id) {
          setChecks((prev) => { const n = { ...prev }; delete n[oldRow.unit_id!]; return n; });
        } else if (row?.unit_id) {
          setChecks((prev) => ({ ...prev, [row.unit_id]: row }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [reload]);

  /**
   * Abre una revisión. `unitIdsToClear` son las unidades cuyo parking/batería se
   * vacían para empezar de cero (nunca las averiadas: su estado se conserva).
   */
  const startReview = useCallback(async (categoryIds: string[], unitIdsToClear: string[]) => {
    const { id, name } = await currentUser();

    if (unitIdsToClear.length > 0) {
      await supabase
        .from('equipment_state')
        .update({ parking: '', battery_level: null, is_charging: false, charging_since: null })
        .eq('is_broken', false)
        .in('unit_id', unitIdsToClear);
    }

    const { data, error } = await db
      .from('equipment_review_sessions')
      .insert({
        started_by: id,
        started_by_name: name,
        category_ids: categoryIds,
      })
      .select()
      .maybeSingle();
    if (error) throw error;
    setSession(data as ReviewSessionRow);
    setChecks({});
    return data as ReviewSessionRow;
  }, []);

  /** Marca un equipo como revisado. Idempotente: repetirlo no duplica nada. */
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
    // Optimista: la pista es grande y la cobertura irregular.
    setChecks((prev) => ({ ...prev, [unitId]: row }));
    const { error } = await db
      .from('equipment_review_checks')
      .upsert(row, { onConflict: 'session_id,unit_id' });
    if (error) {
      console.error('[revisión] no se pudo marcar el equipo', error);
      setChecks((prev) => { const n = { ...prev }; delete n[unitId]; return n; });
      throw error;
    }
  }, [session]);

  /** Deshace la marca de revisado (por si se toca un equipo por error). */
  const unmarkChecked = useCallback(async (unitId: string) => {
    if (!session) return;
    const previous = checks[unitId];
    setChecks((prev) => { const n = { ...prev }; delete n[unitId]; return n; });
    const { error } = await db
      .from('equipment_review_checks')
      .delete()
      .eq('session_id', session.id)
      .eq('unit_id', unitId);
    if (error && previous) setChecks((prev) => ({ ...prev, [unitId]: previous }));
  }, [session, checks]);

  const finishReview = useCallback(async () => {
    if (!session) return;
    const { id, name } = await currentUser();
    await db
      .from('equipment_review_sessions')
      .update({ finished_at: new Date().toISOString(), finished_by: id, finished_by_name: name })
      .eq('id', session.id);
    setSession(null);
    setChecks({});
  }, [session]);

  /** Cambia las categorías incluidas sin perder lo ya revisado. */
  const updateCategories = useCallback(async (categoryIds: string[]) => {
    if (!session) return;
    setSession({ ...session, category_ids: categoryIds });
    await db
      .from('equipment_review_sessions')
      .update({ category_ids: categoryIds })
      .eq('id', session.id);
  }, [session]);

  return {
    loading,
    session,
    checks,
    startReview,
    markChecked,
    unmarkChecked,
    finishReview,
    updateCategories,
    reload,
  };
}
