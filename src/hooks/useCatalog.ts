import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  CatalogState,
  getCatalogSnapshot,
  setCatalogState,
  subscribeCatalog,
} from '@/lib/catalogStore';

const CACHE_KEY = 'catalog-cache-v1';

let loadingPromise: Promise<void> | null = null;

async function fetchCatalog(): Promise<void> {
  const [airlines, models, compartments, holds, loadCodes, timeOverrides] = await Promise.all([
    supabase.from('catalog_airlines').select('*'),
    supabase.from('catalog_aircraft_models').select('*'),
    supabase.from('catalog_compartments').select('*'),
    supabase.from('catalog_holds').select('*'),
    supabase.from('catalog_load_codes').select('*'),
    supabase.from('catalog_time_field_overrides').select('*'),
  ]);

  const next: Partial<CatalogState> = {
    airlines: (airlines.data || []).map((r: any) => ({
      code: r.code, name: r.name, shortName: r.short_name, color: r.color,
      active: r.active, sortOrder: r.sort_order,
    })),
    aircraftModels: (models.data || []).map((r: any) => ({
      id: r.id, airlineCode: r.airline_code, modelCode: r.model_code, label: r.label,
      turnaroundMinutes: r.turnaround_minutes, cleaningMinutes: r.cleaning_minutes,
      active: r.active, sortOrder: r.sort_order,
    })),
    compartments: (compartments.data || []).map((r: any) => ({
      id: r.id, airlineCode: r.airline_code, aircraftModelCode: r.aircraft_model_code,
      name: r.name, holdStyle: r.hold_style, bulk: r.bulk, expandable: r.expandable,
      expandableDefault: r.expandable_default, sortOrder: r.sort_order, active: r.active,
    })),
    holds: (holds.data || []).map((r: any) => ({
      id: r.id, compartmentId: r.compartment_id, label: r.label,
      pairGroup: r.pair_group, pairSide: r.pair_side, sortOrder: r.sort_order, active: r.active,
    })),
    loadCodes: (loadCodes.data || []).map((r: any) => ({
      id: r.id, airlineCode: r.airline_code, code: r.code, label: r.label,
      sortOrder: r.sort_order, active: r.active,
    })),
    timeFieldOverrides: (timeOverrides.data || []).map((r: any) => ({
      id: r.id, airlineCode: r.airline_code, fieldKey: r.field_key,
      visible: r.visible, label: r.label, clockColor: r.clock_color, type: r.type,
      sortOrder: r.sort_order,
    })),
    hydrated: true,
  };

  setCatalogState(next);

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch { /* ignore quota */ }
}

export function hydrateCatalogFromCache(): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    setCatalogState({ ...parsed, hydrated: true });
  } catch { /* ignore */ }
}

export function loadCatalog(): Promise<void> {
  if (!loadingPromise) {
    loadingPromise = fetchCatalog().catch((err) => {
      console.warn('[catalog] failed to load', err);
      loadingPromise = null;
    });
  }
  return loadingPromise;
}

export function refreshCatalog(): Promise<void> {
  loadingPromise = null;
  return loadCatalog();
}

/**
 * Hook that ensures catalog is loaded and subscribes to changes.
 * Returns the current catalog snapshot (reactive).
 */
export function useCatalog() {
  const snapshot = useSyncExternalStore(subscribeCatalog, getCatalogSnapshot, getCatalogSnapshot);

  useEffect(() => {
    if (!snapshot.hydrated) {
      hydrateCatalogFromCache();
    }
    loadCatalog();
  }, []);

  return snapshot;
}
