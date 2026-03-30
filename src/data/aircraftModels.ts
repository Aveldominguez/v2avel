import { AirlineCode } from '@/types/turnaround';

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
  ],
  AIR_CANADA: [
    { model: 'A333', label: 'A333', turnaroundMinutes: 90 },
    { model: 'B777', label: 'B777', turnaroundMinutes: 85 },
    { model: '787-800', label: '787-800', turnaroundMinutes: 85, cleaningMinutes: 25 },
    { model: '787-900', label: '787-900', turnaroundMinutes: 95, cleaningMinutes: 25 },
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
    { model: 'B737', label: 'B737', turnaroundMinutes: 40 },
  ],
  EUROWINGS: [
    { model: 'A320', label: 'A320', turnaroundMinutes: 40 },
    { model: 'A321', label: 'A321', turnaroundMinutes: 45 },
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

export const getModelsForAirline = (airline: AirlineCode): AircraftModelConfig[] => {
  return AIRCRAFT_MODELS[airline] || [];
};

export const getTurnaroundDuration = (airline: AirlineCode, model: string): number => {
  const models = AIRCRAFT_MODELS[airline];
  if (!models) return 40;
  const found = models.find(m => m.model === model);
  return found?.turnaroundMinutes ?? models[0]?.turnaroundMinutes ?? 40;
};

export const getCleaningMinutes = (airline: AirlineCode, model: string): number | undefined => {
  const models = AIRCRAFT_MODELS[airline];
  if (!models) return undefined;
  const found = models.find(m => m.model === model);
  return found?.cleaningMinutes;
};
