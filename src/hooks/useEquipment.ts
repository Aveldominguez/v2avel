import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  EquipmentCategoryRow, EquipmentUnitRow, EquipmentStateRow,
  EquipmentCategoryFull,
} from '@/types/equipment';

/**
 * Loads catalog (categories + units) and live state, then subscribes to realtime
 * changes on equipment_state and the catalog tables.
 */
export const useEquipment = () => {
  const [categories, setCategories] = useState<EquipmentCategoryRow[]>([]);
  const [units, setUnits] = useState<EquipmentUnitRow[]>([]);
  const [states, setStates] = useState<Record<string, EquipmentStateRow>>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [cats, us, sts] = await Promise.all([
      supabase.from('catalog_equipment_categories').select('*').order('sort_order'),
      supabase.from('catalog_equipment_units').select('*').order('sort_order'),
      supabase.from('equipment_state').select('*'),
    ]);
    setCategories((cats.data as any) || []);
    setUnits((us.data as any) || []);
    const map: Record<string, EquipmentStateRow> = {};
    (sts.data as any || []).forEach((s: EquipmentStateRow) => { map[s.unit_id] = s; });
    setStates(map);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Merge a single state row into the local cache (used both by realtime and by
  // the optimistic-update event dispatched from mutations below — needed on iOS
  // PWA where the realtime WebSocket is frozen when the app goes to background).
  const mergeStateRow = useCallback((row: EquipmentStateRow) => {
    setStates(prev => ({ ...prev, [row.unit_id]: row }));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const row = (e as CustomEvent<EquipmentStateRow>).detail;
      if (row?.unit_id) mergeStateRow(row);
    };
    window.addEventListener('equipment-state-changed', handler as EventListener);
    return () => window.removeEventListener('equipment-state-changed', handler as EventListener);
  }, [mergeStateRow]);

  // Refresh whenever the tab/PWA is brought back to the foreground: realtime
  // events that fired while backgrounded on iOS are otherwise lost.
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
      .channel('equipment-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_state' }, (payload) => {
        const row = payload.new as EquipmentStateRow | undefined;
        const oldRow = payload.old as EquipmentStateRow | undefined;
        if (payload.eventType === 'DELETE' && oldRow?.unit_id) {
          setStates(prev => { const n = { ...prev }; delete n[oldRow.unit_id]; return n; });
        } else if (row?.unit_id) {
          setStates(prev => ({ ...prev, [row.unit_id]: row }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catalog_equipment_categories' }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catalog_equipment_units' }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [reload]);


  const fullCategories: EquipmentCategoryFull[] = categories
    .filter(c => c.active)
    .map(c => ({
      ...c,
      units: units
        .filter(u => u.category_id === c.id && u.active)
        .map(u => ({ ...u, state: states[u.id] ?? null })),
    }));

  return { loading, categories, units, states, fullCategories, reload };
};

/* ── Mutations (used by both Rampa and Equipos modules) ── */

const ensureState = async (unitId: string) => {
  // Make sure a row exists so updates are idempotent.
  await supabase.from('equipment_state').upsert(
    { unit_id: unitId } as any,
    { onConflict: 'unit_id', ignoreDuplicates: true },
  );
};

const logActivity = async (
  unitId: string, unitCode: string, categoryId: string,
  field: string, oldVal: string | null, newVal: string | null,
  source: 'rampa' | 'equipos',
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  let username = user.email ?? null;
  const { data: prof } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle();
  if (prof?.display_name) username = prof.display_name;
  await supabase.from('equipment_activity_log').insert({
    user_id: user.id, username, unit_id: unitId, unit_code: unitCode, category_id: categoryId,
    field_changed: field, old_value: oldVal, new_value: newVal, source,
  });
};

export async function updateParking(unitId: string, code: string, categoryId: string, oldVal: string, parking: string, source: 'rampa' | 'equipos') {
  await ensureState(unitId);
  const { error } = await supabase.from('equipment_state').update({ parking, updated_by: (await supabase.auth.getUser()).data.user?.id ?? null }).eq('unit_id', unitId);
  if (!error) logActivity(unitId, code, categoryId, 'parking', oldVal || null, parking || null, source);
}

export async function updateBattery(unitId: string, code: string, categoryId: string, oldVal: number | null, level: number | null, source: 'rampa' | 'equipos') {
  await ensureState(unitId);
  const { error } = await supabase.from('equipment_state').update({ battery_level: level, is_charging: false, charging_since: null, updated_by: (await supabase.auth.getUser()).data.user?.id ?? null }).eq('unit_id', unitId);
  if (!error) logActivity(unitId, code, categoryId, 'battery', oldVal !== null ? String(oldVal) : null, level !== null ? String(level) : null, source);
}

export async function toggleCharging(unitId: string, code: string, categoryId: string, currentlyCharging: boolean, source: 'rampa' | 'equipos') {
  await ensureState(unitId);
  const nowCharging = !currentlyCharging;
  await supabase.from('equipment_state').update({
    is_charging: nowCharging,
    charging_since: nowCharging ? new Date().toISOString() : null,
    updated_by: (await supabase.auth.getUser()).data.user?.id ?? null,
  }).eq('unit_id', unitId);
  logActivity(unitId, code, categoryId, 'charging', String(currentlyCharging), String(nowCharging), source);
}

export async function toggleBroken(unitId: string, code: string, categoryId: string, currentlyBroken: boolean, source: 'rampa' | 'equipos') {
  await ensureState(unitId);
  const update: any = { is_broken: !currentlyBroken, updated_by: (await supabase.auth.getUser()).data.user?.id ?? null };
  if (!currentlyBroken) {
    update.is_charging = false;
    update.battery_level = null;
    update.charging_since = null;
  }
  await supabase.from('equipment_state').update(update).eq('unit_id', unitId);
  logActivity(unitId, code, categoryId, 'broken', String(currentlyBroken), String(!currentlyBroken), source);
}
