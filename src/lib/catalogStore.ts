// Global catalog overlay store.
// Holds admin-managed overrides on top of hardcoded defaults.
// Updated by useCatalog hook; read synchronously by data getters.

export interface AirlineOverride {
  code: string;
  name: string;
  shortName: string;
  color: string;
  active: boolean;
  sortOrder: number;
}

export interface AircraftModelOverride {
  id: string;
  airlineCode: string;
  modelCode: string;
  label: string;
  turnaroundMinutes: number;
  cleaningMinutes: number | null;
  active: boolean;
  sortOrder: number;
}

export interface CompartmentOverride {
  id: string;
  airlineCode: string;
  aircraftModelCode: string | null;
  name: string;
  holdStyle: 'default' | 'ita';
  bulk: boolean;
  expandable: boolean;
  expandableDefault: number | null;
  sortOrder: number;
  active: boolean;
}

export interface HoldOverride {
  id: string;
  compartmentId: string;
  label: string;
  pairGroup: string | null;
  pairSide: 'left' | 'right' | null;
  sortOrder: number;
  active: boolean;
}

export interface LoadCodeOverride {
  id: string;
  airlineCode: string;
  code: string;
  label: string;
  sortOrder: number;
  active: boolean;
}

export interface TimeFieldOverride {
  id: string;
  airlineCode: string;
  fieldKey: string;
  visible: boolean;
  label: string | null;
  clockColor: 'green' | 'red' | 'default' | null;
  type: 'time' | 'boolean' | 'boolean-text' | null;
  sortOrder: number | null;
}

export interface CatalogState {
  airlines: AirlineOverride[];
  aircraftModels: AircraftModelOverride[];
  compartments: CompartmentOverride[];
  holds: HoldOverride[];
  loadCodes: LoadCodeOverride[];
  timeFieldOverrides: TimeFieldOverride[];
  hydrated: boolean;
}

const EMPTY: CatalogState = {
  airlines: [],
  aircraftModels: [],
  compartments: [],
  holds: [],
  loadCodes: [],
  timeFieldOverrides: [],
  hydrated: false,
};

let state: CatalogState = { ...EMPTY };
const listeners = new Set<() => void>();

export function getCatalogSnapshot(): CatalogState {
  return state;
}

export function setCatalogState(next: Partial<CatalogState>) {
  state = { ...state, ...next };
  listeners.forEach(l => l());
}

export function subscribeCatalog(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

// Convenient indexed accessors
export function findAirlineOverride(code: string): AirlineOverride | undefined {
  return state.airlines.find(a => a.code === code);
}

export function findModelOverride(airlineCode: string, modelCode: string): AircraftModelOverride | undefined {
  return state.aircraftModels.find(m => m.airlineCode === airlineCode && m.modelCode === modelCode);
}

export function findCompartmentOverride(id: string): CompartmentOverride | undefined {
  return state.compartments.find(c => c.id === id);
}

export function findHoldOverride(id: string): HoldOverride | undefined {
  return state.holds.find(h => h.id === id);
}

export function findLoadCodeOverride(airlineCode: string, code: string): LoadCodeOverride | undefined {
  return state.loadCodes.find(l => l.airlineCode === airlineCode && l.code === code);
}

export function findTimeFieldOverride(airlineCode: string, fieldKey: string): TimeFieldOverride | undefined {
  return state.timeFieldOverrides.find(t => t.airlineCode === airlineCode && t.fieldKey === fieldKey);
}
