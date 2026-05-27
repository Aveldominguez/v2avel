import { AirlineCode } from '@/types/turnaround';
import { getCatalogSnapshot } from '@/lib/catalogStore';

export interface AircraftModelConfig {
  model: string;
  label: string;
  turnaroundMinutes: number;
  cleaningMinutes?: number;
}

export const AIRCRAFT_MODELS: Record<AirlineCode, AircraftModelConfig[]> = {
  A_JET: [
    { model: 'A320', label: 'A320', turnaroundMinutes: 45 },
    { model: 'A321', label: 'A321', turnaroundMinutes: 50 },
    { model: '737-800', label: '737-800', turnaroundMinutes: 45 },
    { model: '737_MAX', label: '737 Max', turnaroundMinutes: 45 },
    { model: 'A320_AIRBALTIC', label: 'A320 airBaltic', turnaroundMinutes: 45 },
  ],
  AEGEAN: [
    { model: 'A320', label: 'A320', turnaroundMinutes: 50, cleaningMinutes: 12 },
    { model: 'A321', label: 'A321', turnaroundMinutes: 55, cleaningMinutes: 15 },
  ],
  TAP: [
    { model: 'EMB90', label: 'EMB90', turnaroundMinutes: 45 },
    { model: 'EMB95', label: 'EMB95', turnaroundMinutes: 45 },
    { model: 'A319', label: 'A319', turnaroundMinutes: 45 },
    { model: 'A320', label: 'A320', turnaroundMinutes: 45 },
    { model: 'A321', label: 'A321', turnaroundMinutes: 50, cleaningMinutes: 5 },
    { model: '321_GRANEL', label: '321 Granel', turnaroundMinutes: 45 },
  ],
  AIR_CANADA: [
    { model: 'A333', label: 'A333', turnaroundMinutes: 90 },
    { model: 'B777', label: 'B777', turnaroundMinutes: 85 },
    { model: '787-800', label: '787-800', turnaroundMinutes: 85, cleaningMinutes: 25 },
    { model: '787-900', label: '787-900', turnaroundMinutes: 95, cleaningMinutes: 25 },
  ],
  AIR_CANADA_CARGO: [
    { model: 'A333', label: 'A333', turnaroundMinutes: 90 },
    { model: 'B777', label: 'B777', turnaroundMinutes: 85 },
    { model: '787-800', label: '787-800', turnaroundMinutes: 85, cleaningMinutes: 25 },
    { model: '787-900', label: '787-900', turnaroundMinutes: 95, cleaningMinutes: 25 },
  ],
  WESTJET: [
    { model: '737-800', label: '737-800', turnaroundMinutes: 45 },
  ],
  TRANSAVIA: [
    { model: 'A320', label: 'A320', turnaroundMinutes: 45 },
    { model: 'A321', label: 'A321', turnaroundMinutes: 50 },
    { model: '737-800', label: '737-800', turnaroundMinutes: 45 },
    { model: 'A320_AIRBALTIC', label: 'A320 airBaltic', turnaroundMinutes: 45 },
  ],
  ALBASTAR: [
    { model: 'B737', label: 'B737', turnaroundMinutes: 50 },
  ],
  ICELANDAIR: [
    { model: 'A320', label: 'A320', turnaroundMinutes: 50 },
  ],
  WIZZ: [
    { model: 'A320', label: 'A320', turnaroundMinutes: 40 },
    { model: 'A321', label: 'A321', turnaroundMinutes: 45 },
    { model: 'A321_XLR', label: 'A321 XLR', turnaroundMinutes: 45 },
    { model: 'B737', label: 'B737', turnaroundMinutes: 40 },
  ],
  EUROWINGS: [
    { model: 'A319', label: 'A319', turnaroundMinutes: 40 },
    { model: 'A320', label: 'A320', turnaroundMinutes: 40 },
    { model: 'A321', label: 'A321', turnaroundMinutes: 45 },
  ],
  CROATIA: [
    { model: 'A220-300', label: 'A220-300', turnaroundMinutes: 45 },
  ],
  AIR_EST: [
    { model: '340F', label: 'SAAB 340F', turnaroundMinutes: 60 },
  ],
  NILE_AIR: [
    { model: 'A320', label: 'A320', turnaroundMinutes: 40 },
    { model: 'A321', label: 'A321', turnaroundMinutes: 45 },
  ],
  AZUL: [
    { model: 'B767', label: 'B767', turnaroundMinutes: 105 },
    { model: 'A339', label: 'A339', turnaroundMinutes: 105 },
  ],
  ITA: [
    { model: 'A220', label: 'A220', turnaroundMinutes: 45 },
    { model: 'A319', label: 'A319', turnaroundMinutes: 45 },
    { model: 'A320', label: 'A320', turnaroundMinutes: 50 },
    { model: 'A321', label: 'A321', turnaroundMinutes: 50 },
  ],
  AMAZON: [
    { model: 'B734', label: 'B734', turnaroundMinutes: 75 },
  ],
  PEGASUS: [
    { model: 'A320', label: 'A320', turnaroundMinutes: 45 },
    { model: 'A321', label: 'A321', turnaroundMinutes: 65 },
    { model: 'B737', label: 'B737', turnaroundMinutes: 45 },
  ],
  SKYEXPRESS: [
    { model: 'A320', label: 'A320', turnaroundMinutes: 40 },
    { model: 'OTHER', label: 'Genérico', turnaroundMinutes: 40 },
  ],
  FEDEX: [
    { model: 'OTHER', label: 'Genérico', turnaroundMinutes: 60 },
  ],
  SIN_MARCA: [
    { model: 'A220', label: 'A220', turnaroundMinutes: 45 },
    { model: 'A220-300', label: 'A220-300', turnaroundMinutes: 45 },
    { model: 'A319', label: 'A319', turnaroundMinutes: 45 },
    { model: 'A320', label: 'A320', turnaroundMinutes: 45 },
    { model: 'A321', label: 'A321', turnaroundMinutes: 50 },
    { model: 'A333', label: 'A333', turnaroundMinutes: 90 },
    { model: 'A339', label: 'A339', turnaroundMinutes: 105 },
    { model: 'B734', label: 'B734', turnaroundMinutes: 75 },
    { model: 'B737', label: 'B737', turnaroundMinutes: 45 },
    { model: '737-800', label: '737-800', turnaroundMinutes: 45 },
    { model: 'B767', label: 'B767', turnaroundMinutes: 105 },
    { model: 'B777', label: 'B777', turnaroundMinutes: 85 },
    { model: '787-800', label: '787-800', turnaroundMinutes: 85 },
    { model: '787-900', label: '787-900', turnaroundMinutes: 95 },
    { model: 'EMB90', label: 'EMB90', turnaroundMinutes: 45 },
    { model: 'EMB95', label: 'EMB95', turnaroundMinutes: 45 },
    { model: 'OTHER', label: 'Genérico', turnaroundMinutes: 50 },
  ],
};

function applyModelOverlay(airline: AirlineCode): AircraftModelConfig[] {
  const base = AIRCRAFT_MODELS[airline] || [];
  const { aircraftModels } = getCatalogSnapshot();
  const ovs = aircraftModels.filter(m => m.airlineCode === airline);

  // Merge by modelCode: override existing or append new.
  const map = new Map<string, AircraftModelConfig & { sortOrder: number; active: boolean }>();
  base.forEach((m, i) => map.set(m.model, { ...m, sortOrder: i, active: true }));
  ovs.forEach(o => {
    const existing = map.get(o.modelCode);
    map.set(o.modelCode, {
      model: o.modelCode,
      label: o.label,
      turnaroundMinutes: o.turnaroundMinutes,
      cleaningMinutes: o.cleaningMinutes ?? undefined,
      sortOrder: existing ? existing.sortOrder : 10_000 + o.sortOrder,
      active: o.active,
    });
  });
  return Array.from(map.values())
    .filter(m => m.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ sortOrder, active, ...rest }) => rest);
}

export const getModelsForAirline = (airline: AirlineCode): AircraftModelConfig[] => {
  return applyModelOverlay(airline);
};

export const getTurnaroundDuration = (airline: AirlineCode, model: string): number => {
  const models = applyModelOverlay(airline);
  const found = models.find(m => m.model === model);
  return found?.turnaroundMinutes ?? models[0]?.turnaroundMinutes ?? 40;
};

export const getCleaningMinutes = (airline: AirlineCode, model: string): number | undefined => {
  const models = applyModelOverlay(airline);
  const found = models.find(m => m.model === model);
  return found?.cleaningMinutes;
};

