// Types for Turnaround (Scale) Management
import { getCatalogSnapshot } from '@/lib/catalogStore';

// Airline code is a free-form string so admins can register new airlines from the
// catalog admin panel without code changes. Known built-in codes are listed in AIRLINES.
export type AirlineCode = string;
export type KnownAirlineCode = 'TAP' | 'WIZZ' | 'ITA' | 'AEGEAN' | 'PEGASUS' | 'TRANSAVIA' | 'SKYEXPRESS' | 'SKYUP' | 'FEDEX' | 'AIR_CANADA' | 'AIR_CANADA_CARGO' | 'ALBASTAR' | 'ICELANDAIR' | 'AZUL' | 'AMAZON' | 'A_JET' | 'NILE_AIR' | 'EUROWINGS' | 'CROATIA' | 'AIR_EST' | 'SIN_MARCA' | 'WESTJET';

export interface TurnaroundTimes {
  lirReception: string | null;           // Recepción de LIR
  chocksOnArrival: string | null;        // Calzos Llegada
  stairsTime: string | null;             // Puesta de Escalera (Llegada)
  stairsRemovalArrival: string | null;   // Retirada de Escalera (Llegada)
  unloadingStart: string | null;         // Inicio Descarga
  unloadingEnd: string | null;           // Fin Descarga
  loadingStart: string | null;           // Inicio Carga
  loadingEnd: string | null;             // Fin Carga
  lastHandBag: string | null;            // Cierre Coordinador
  stairsPlacementDeparture: string | null; // Puesta de Escalera (Salida)
  specialEndLoading: string | null;      // Retirada Escalera (Salida)
  chocksOff: string | null;              // Calzos Salida
  busArrival: string | null;             // 1ª Jardinera
  lastBus: string | null;                // (legacy - no longer used)
  bus2: string | null;                   // 2ª Jardinera
  bus3: string | null;                   // 3ª Jardinera
  bus4: string | null;                   // 4ª Jardinera
  bus5: string | null;                   // 5ª Jardinera
  bus6: string | null;                   // 6ª Jardinera
  cargoArrival: boolean;                 // Cargo de llegada
  cargoDeparture: boolean;               // Cargo de salida
  firstBag: string | null;               // 1ª Maleta / Envío 1ª Ristra
  ristra2: string | null;                // Envío 2ª Ristra (Amazon)
  ristra3: string | null;                // Envío 3ª Ristra (Amazon)
  ristra4: string | null;                // Envío 4ª Ristra (Amazon)
  gpuOn: string | null;                  // Puesta de GPU
  gpuOff: string | null;                 // Retirada de GPU
  mailArrival: boolean;                  // Correo Llegada
  mailDeparture: boolean;                // Correo Salida
  aviArrival: boolean;                   // AVI Llegada
  aviDeparture: boolean;                 // AVI Salida
  departureFlightNumber: string | null;  // Número de vuelo de salida
  dock1: string | null;                   // 1ª Muelle
  dock2: string | null;                   // 2ª Muelle
  dock3: string | null;                   // 3ª Muelle
  dock4: string | null;                   // 4ª Muelle
  tango: string | null;                  // Tango
  parkingArrival: string | null;          // Llegada a Parking (FedEx)
  fedexSuperArrival: string | null;       // Llegada FedEx Súper (FedEx)
  isRemote: boolean;                     // En remoto
  remoteLocation: string | null;         // Ubicación remoto
  asu: boolean;                          // ASU activo
  asuData: string | null;               // Datos ASU
  acu: boolean;                          // ACU activo
  acuData: string | null;                // Datos ACU
  acuStart: string | null;               // ACU Inicio
  acuEnd: string | null;                 // ACU Retirada
  aircraftModel: string | null;         // Modelo de avión
  loadingSheetUrl: string | null;       // Hoja de carga (legacy single - backward compat)
  loadingSheetUrls: string[];           // Hoja de carga (múltiples, máx 7)
  fileUrl: string | null;               // File (legacy single - backward compat)
  fileUrls: string[];                   // Adjuntar File (múltiples, máx 7)
  observationPhotos: string[];          // Fotos de observaciones (máx 7)
  matricula: string | null;             // Matrícula de la aeronave
  soloLlegada: boolean;                 // Sólo llegada (arrival only)
  soloSalida: boolean;                  // Sólo salida (departure only)
  pushBack: boolean;                    // Push Back requerido (parking T)
  pushBackTime: string | null;          // Hora de Push Back
  bagSearchStart: string | null;        // Inicio búsqueda maleta
  bagSearchEnd: string | null;          // Fin búsqueda maleta
  departureTime: string | null;         // Hora de salida programada
  incidentReport?: {                    // Informe de incidente
    nombre: string;
    descripcion: string;
  } | null;
  equipment?: Array<{                   // Equipos utilizados
    categoryId: string;
    equipmentId: string;
    percentage: string;
  }>;
  bodegasData?: {                       // Bodegas AFT y FWD (FedEx/Amazon)
    f1: string;
    f2: string;
    f3: string;
    a1: string;
    a2: string;
    a3: string;
  };
  originStation?: string | null;       // Estación origen del vuelo de llegada (ARION)
  destStation?: string | null;         // Estación destino del vuelo de salida (ARION)
  homeStation?: string | null;         // Estación local / base (ARION)
  ldmRaw?: string | null;              // LDM bruto recibido de ARION
  airlineLogo?: string | null;         // Logo aerolínea (data URL) recibido de ARION
}

export interface FieldDefinition {
  id: string;
  airline: AirlineCode;
  code: string;
  label: string;
  inputType: 'alphanumeric';
  sortOrder: number;
  active: boolean;
}

export interface FieldValue {
  fieldDefinitionId: string;
  value: string;
  previousValue?: string;
  nilSetAt?: string;           // ISO timestamp when NIL was set (expires after 24h)
  updatedAt: Date;
  updatedBy?: string;
}

export interface Turnaround {
  id: string;
  flightNumber: string;
  date: Date;
  airline: AirlineCode;
  times: TurnaroundTimes;
  fieldValues: FieldValue[];
  observations: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Validation errors for time fields
export interface TimeValidationError {
  field: string;
  message: string;
}

// Airline display info
export interface AirlineInfo {
  code: AirlineCode;
  name: string;
  shortName: string;
  color: string;
}

export const AIRLINES: AirlineInfo[] = [
  { code: 'A_JET', name: 'A Jet', shortName: 'A JET', color: 'hsl(190, 75%, 45%)' },
  { code: 'AIR_EST', name: 'Air Est', shortName: 'AIR EST', color: 'hsl(160, 65%, 40%)' },
  { code: 'AEGEAN', name: 'Aegean Airlines', shortName: 'AEGEAN', color: 'hsl(200, 80%, 45%)' },
  { code: 'AIR_CANADA', name: 'Air Canada', shortName: 'AIR CANADA', color: 'hsl(0, 70%, 50%)' },
  { code: 'AIR_CANADA_CARGO', name: 'Air Canada Cargo', shortName: 'AC CARGO', color: 'hsl(0, 65%, 40%)' },
  { code: 'ALBASTAR', name: 'AlbaStar', shortName: 'ALBASTAR', color: 'hsl(45, 80%, 50%)' },
  { code: 'AMAZON', name: 'Amazon Air', shortName: 'AMAZON', color: 'hsl(35, 100%, 50%)' },
  { code: 'AZUL', name: 'Azul', shortName: 'AZUL', color: 'hsl(220, 90%, 55%)' },
  { code: 'CROATIA', name: 'Croatia Airlines', shortName: 'CROATIA', color: 'hsl(210, 80%, 40%)' },
  { code: 'EUROWINGS', name: 'Eurowings', shortName: 'EUROWINGS', color: 'hsl(340, 75%, 50%)' },
  { code: 'FEDEX', name: 'FedEx', shortName: 'FEDEX', color: 'hsl(270, 60%, 45%)' },
  { code: 'ICELANDAIR', name: 'Icelandair', shortName: 'ICELANDAIR', color: 'hsl(210, 60%, 45%)' },
  { code: 'NILE_AIR', name: 'Nile Air', shortName: 'NILE AIR', color: 'hsl(15, 80%, 50%)' },
  { code: 'ITA', name: 'ITA Airways', shortName: 'ITA', color: 'hsl(210, 100%, 52%)' },
  { code: 'PEGASUS', name: 'Pegasus Airlines', shortName: 'PEGASUS', color: 'hsl(30, 90%, 50%)' },
  { code: 'SIN_MARCA', name: 'Sin Marca', shortName: 'SIN MARCA', color: 'hsl(0, 0%, 55%)' },
  { code: 'SKYEXPRESS', name: 'Sky Express', shortName: 'SKY EXPRESS', color: 'hsl(220, 80%, 55%)' },
  { code: 'SKYUP', name: 'SkyUp', shortName: 'SKYUP', color: 'hsl(145, 70%, 40%)' },
  { code: 'TAP', name: 'TAP Air Portugal', shortName: 'TAP', color: 'hsl(142, 76%, 36%)' },
  { code: 'TRANSAVIA', name: 'Transavia', shortName: 'TRANSAVIA', color: 'hsl(145, 70%, 40%)' },
  { code: 'WESTJET', name: 'WestJet', shortName: 'WESTJET', color: 'hsl(200, 85%, 45%)' },
  { code: 'WIZZ', name: 'Wizz Air', shortName: 'WIZZ', color: 'hsl(316, 73%, 52%)' },
];

/**
 * Returns the merged airline list: built-in `AIRLINES` overlaid with any
 * admin-managed entries from the catalog store (renames, color/short-name overrides,
 * activation flags, and brand-new airlines).
 */
export function getAllAirlines(): AirlineInfo[] {
  const overrides = getCatalogSnapshot().airlines;
  const byCode = new Map(overrides.map(o => [o.code, o]));
  const base = AIRLINES.map(a => {
    const ov = byCode.get(a.code);
    if (!ov) return a;
    return { code: a.code, name: ov.name || a.name, shortName: ov.shortName || a.shortName, color: ov.color || a.color };
  }).filter(a => {
    const ov = byCode.get(a.code);
    return ov ? ov.active : true;
  });
  const extras: AirlineInfo[] = overrides
    .filter(o => o.active && !AIRLINES.some(a => a.code === o.code))
    .map(o => ({ code: o.code, name: o.name, shortName: o.shortName, color: o.color }));
  return [...base, ...extras].sort((a, b) => a.name.localeCompare(b.name));
}

export function findAirline(code: string): AirlineInfo | undefined {
  return getAllAirlines().find(a => a.code === code);
}

// Time field configuration for airline-specific rendering
export interface TimeFieldConfig {
  key: keyof TurnaroundTimes;
  label: string;
  clockColor?: 'green' | 'red' | 'default';
  type: 'time' | 'boolean' | 'boolean-text' | 'acu';
}

// Arrival fields (for non-FedEx/Amazon split layout)
const ARRIVAL_FIELDS_WITH_STAIRS: TimeFieldConfig[] = [
  { key: 'chocksOnArrival', label: 'Calzos Llegada', clockColor: 'green', type: 'time' },
  { key: 'stairsTime', label: 'Puesta Escalera', clockColor: 'green', type: 'time' },
  { key: 'unloadingStart', label: 'Inicio Descarga', clockColor: 'green', type: 'time' },
  { key: 'unloadingEnd', label: 'Fin Descarga', clockColor: 'red', type: 'time' },
  { key: 'firstBag', label: '1ª Maleta', clockColor: 'green', type: 'time' },
  { key: 'cargoArrival', label: 'Cargo Llegada', type: 'boolean' },
  { key: 'mailArrival', label: 'Correo Llegada', type: 'boolean' },
  { key: 'aviArrival', label: 'AVI Llegada', type: 'boolean' },
];

const ARRIVAL_FIELDS_NO_STAIRS: TimeFieldConfig[] = [
  { key: 'chocksOnArrival', label: 'Calzos Llegada', clockColor: 'green', type: 'time' },
  { key: 'unloadingStart', label: 'Inicio Descarga', clockColor: 'green', type: 'time' },
  { key: 'unloadingEnd', label: 'Fin Descarga', clockColor: 'red', type: 'time' },
  { key: 'firstBag', label: '1ª Maleta', clockColor: 'green', type: 'time' },
  { key: 'cargoArrival', label: 'Cargo Llegada', type: 'boolean' },
  { key: 'mailArrival', label: 'Correo Llegada', type: 'boolean' },
  { key: 'aviArrival', label: 'AVI Llegada', type: 'boolean' },
];

// Departure fields (for non-FedEx/Amazon split layout)
const DEPARTURE_FIELDS_WITH_STAIRS: TimeFieldConfig[] = [
  { key: 'loadingStart', label: 'Inicio Carga', clockColor: 'green', type: 'time' },
  { key: 'loadingEnd', label: 'Fin Carga', clockColor: 'red', type: 'time' },
  { key: 'lirReception', label: 'Recepción de LIR', type: 'time' },
  { key: 'lastHandBag', label: 'Cierre Coordinador', clockColor: 'red', type: 'time' },
  { key: 'dock1', label: '1ª Muelle', clockColor: 'green', type: 'time' },
  { key: 'specialEndLoading', label: 'Retirada Escalera', clockColor: 'red', type: 'time' },
  { key: 'cargoDeparture', label: 'Cargo Salida', type: 'boolean' },
  { key: 'mailDeparture', label: 'Correo Salida', type: 'boolean' },
  { key: 'aviDeparture', label: 'AVI Salida', type: 'boolean' },
  { key: 'asu', label: 'ASU', type: 'boolean-text' },
  { key: 'acu', label: 'ACU', type: 'acu' },
  { key: 'bagSearchStart', label: 'Inicio Búsqueda Maleta', clockColor: 'green', type: 'time' },
  { key: 'bagSearchEnd', label: 'Fin Búsqueda Maleta', clockColor: 'red', type: 'time' },
  { key: 'chocksOff', label: 'Calzos Salida', clockColor: 'red', type: 'time' },
];

const DEPARTURE_FIELDS_NO_STAIRS: TimeFieldConfig[] = [
  { key: 'loadingStart', label: 'Inicio Carga', clockColor: 'green', type: 'time' },
  { key: 'loadingEnd', label: 'Fin Carga', clockColor: 'red', type: 'time' },
  { key: 'lirReception', label: 'Recepción de LIR', type: 'time' },
  { key: 'lastHandBag', label: 'Cierre Coordinador', clockColor: 'red', type: 'time' },
  { key: 'dock1', label: '1ª Muelle', clockColor: 'green', type: 'time' },
  { key: 'cargoDeparture', label: 'Cargo Salida', type: 'boolean' },
  { key: 'mailDeparture', label: 'Correo Salida', type: 'boolean' },
  { key: 'aviDeparture', label: 'AVI Salida', type: 'boolean' },
  { key: 'asu', label: 'ASU', type: 'boolean-text' },
  { key: 'acu', label: 'ACU', type: 'acu' },
  { key: 'bagSearchStart', label: 'Inicio Búsqueda Maleta', clockColor: 'green', type: 'time' },
  { key: 'bagSearchEnd', label: 'Fin Búsqueda Maleta', clockColor: 'red', type: 'time' },
  { key: 'chocksOff', label: 'Calzos Salida', clockColor: 'red', type: 'time' },
];

// Base fields for TAP/AEGEAN/ITA (with stairs) - kept for FedEx/Amazon legacy
const FIELDS_WITH_STAIRS: TimeFieldConfig[] = [
  { key: 'chocksOnArrival', label: 'Calzos Llegada', clockColor: 'green', type: 'time' },
  { key: 'chocksOff', label: 'Calzos Salida', clockColor: 'red', type: 'time' },
  { key: 'stairsTime', label: 'Puesta Escalera', clockColor: 'green', type: 'time' },
  { key: 'specialEndLoading', label: 'Retirada Escalera', clockColor: 'red', type: 'time' },
  { key: 'unloadingStart', label: 'Inicio Descarga', clockColor: 'green', type: 'time' },
  { key: 'unloadingEnd', label: 'Fin Descarga', clockColor: 'red', type: 'time' },
  { key: 'loadingStart', label: 'Inicio Carga', clockColor: 'green', type: 'time' },
  { key: 'loadingEnd', label: 'Fin Carga', clockColor: 'red', type: 'time' },
  { key: 'firstBag', label: '1ª Maleta', clockColor: 'green', type: 'time' },
  { key: 'lastHandBag', label: 'Cierre Coordinador', clockColor: 'red', type: 'time' },
  { key: 'lirReception', label: 'Recepción de LIR', type: 'time' },
  { key: 'dock1', label: '1ª Muelle', clockColor: 'green', type: 'time' },
  { key: 'cargoArrival', label: 'Cargo Llegada', type: 'boolean' },
  { key: 'mailArrival', label: 'Correo Llegada', type: 'boolean' },
  { key: 'asu', label: 'ASU', type: 'boolean-text' },
  { key: 'acu', label: 'ACU', type: 'acu' },
];

// Fields without stairs (WIZZ, etc.) - kept for FedEx/Amazon legacy
const FIELDS_NO_STAIRS: TimeFieldConfig[] = [
  { key: 'chocksOnArrival', label: 'Calzos Llegada', clockColor: 'green', type: 'time' },
  { key: 'chocksOff', label: 'Calzos Salida', clockColor: 'red', type: 'time' },
  { key: 'unloadingStart', label: 'Inicio Descarga', clockColor: 'green', type: 'time' },
  { key: 'unloadingEnd', label: 'Fin Descarga', clockColor: 'red', type: 'time' },
  { key: 'loadingStart', label: 'Inicio Carga', clockColor: 'green', type: 'time' },
  { key: 'loadingEnd', label: 'Fin Carga', clockColor: 'red', type: 'time' },
  { key: 'firstBag', label: '1ª Maleta', clockColor: 'green', type: 'time' },
  { key: 'lastHandBag', label: 'Cierre Coordinador', clockColor: 'red', type: 'time' },
  { key: 'lirReception', label: 'Recepción de LIR', type: 'time' },
  { key: 'dock1', label: '1ª Muelle', clockColor: 'green', type: 'time' },
  { key: 'cargoArrival', label: 'Cargo Llegada', type: 'boolean' },
  { key: 'mailArrival', label: 'Correo Llegada', type: 'boolean' },
  { key: 'asu', label: 'ASU', type: 'boolean-text' },
  { key: 'acu', label: 'ACU', type: 'acu' },
];

// FedEx-specific fields
const FIELDS_FEDEX: TimeFieldConfig[] = [
  { key: 'chocksOnArrival', label: 'Calzos Llegada', clockColor: 'green', type: 'time' },
  { key: 'chocksOff', label: 'Calzos Salida', clockColor: 'red', type: 'time' },
  { key: 'stairsTime', label: 'Puesta Escalera', clockColor: 'green', type: 'time' },
  { key: 'specialEndLoading', label: 'Retirada Escalera', clockColor: 'red', type: 'time' },
  { key: 'unloadingStart', label: 'Inicio Descarga', clockColor: 'green', type: 'time' },
  { key: 'unloadingEnd', label: 'Fin Descarga', clockColor: 'red', type: 'time' },
  { key: 'loadingStart', label: 'Inicio Carga', clockColor: 'green', type: 'time' },
  { key: 'loadingEnd', label: 'Fin Carga', clockColor: 'red', type: 'time' },
  { key: 'lirReception', label: 'Recepción de LIR', type: 'time' },
  { key: 'dock1', label: '1ª Ristra', clockColor: 'green', type: 'time' },
  { key: 'parkingArrival', label: 'Llegada a Parking', clockColor: 'green', type: 'time' },
  { key: 'fedexSuperArrival', label: 'Llegada FedEx Súper', clockColor: 'green', type: 'time' },
  { key: 'asu', label: 'ASU', type: 'boolean-text' },
  { key: 'acu', label: 'ACU', type: 'acu' },
];

// Remote-only fields
const REMOTE_FIELDS: TimeFieldConfig[] = [
  { key: 'gpuOn', label: 'Puesta de GPU', type: 'time' },
  { key: 'busArrival', label: '1ª Jardinera', type: 'time' },
];

const REMOTE_STAIRS_FIELDS: TimeFieldConfig[] = [
  { key: 'stairsTime', label: 'Puesta Escalera', clockColor: 'green', type: 'time' },
  { key: 'specialEndLoading', label: 'Retirada Escalera', clockColor: 'red', type: 'time' },
];

const AIRLINES_WITH_STAIRS: AirlineCode[] = ['TAP', 'AEGEAN', 'ITA', 'AIR_CANADA', 'AIR_CANADA_CARGO', 'AZUL', 'AMAZON', 'PEGASUS', 'SIN_MARCA', 'A_JET', 'SKYEXPRESS', 'WESTJET'];

// Airlines that use the split layout (all except FedEx and Amazon)
const SPLIT_LAYOUT_EXCLUDED: AirlineCode[] = ['FEDEX', 'AMAZON'];

export const usesSplitLayout = (airline: AirlineCode): boolean => {
  return !SPLIT_LAYOUT_EXCLUDED.includes(airline);
};

// Friendly default labels for known time field keys. Used when an admin override
// enables a field without providing a custom label, so the form never shows
// the raw technical key (e.g. "AVIARRIVAL", "GPUOFF").
const TIME_FIELD_FALLBACK_LABELS: Record<string, string> = {
  chocksOnArrival: 'Calzos Llegada',
  chocksOff: 'Calzos Salida',
  stairsTime: 'Puesta Escalera',
  stairsRemovalArrival: 'Retirada Escalera',
  stairsPlacementDeparture: 'Puesta Escalera',
  specialEndLoading: 'Retirada Escalera',
  unloadingStart: 'Inicio Descarga',
  unloadingEnd: 'Fin Descarga',
  loadingStart: 'Inicio Carga',
  loadingEnd: 'Fin Carga',
  firstBag: '1ª Maleta',
  lastHandBag: 'Cierre Coordinador',
  lirReception: 'Recepción de LIR',
  dock1: '1ª Muelle',
  cargoArrival: 'Cargo Llegada',
  cargoDeparture: 'Cargo Salida',
  mailArrival: 'Correo Llegada',
  mailDeparture: 'Correo Salida',
  aviArrival: 'AVI Llegada',
  aviDeparture: 'AVI Salida',
  asu: 'ASU',
  acu: 'ACU',
  bagSearchStart: 'Inicio Búsqueda Maleta',
  bagSearchEnd: 'Fin Búsqueda Maleta',
  gpuOn: 'Puesta de GPU',
  gpuOff: 'Retirada de GPU',
  busArrival: '1ª Jardinera',
  parkingArrival: 'Llegada a Parking',
  fedexSuperArrival: 'Llegada FedEx Súper',
  pushBackTime: 'Fin Push Back',
};

// Apply admin overrides (catalog_time_field_overrides) to a list of fields.
// - Drops fields where override sets visible=false
// - Overrides label / clockColor when provided
// - Appends extra fields the admin explicitly enabled (visible=true) that aren't
//   present in the defaults, so a toggle ON in admin actually surfaces a field.
// - `allowedAppendKeys`: when provided, only append unknown overrides whose
//   fieldKey is in this set (used to keep arrival-only fields out of the
//   departure block and vice-versa).
const applyTimeFieldOverrides = (
  airline: AirlineCode,
  fields: TimeFieldConfig[],
  allowedAppendKeys?: Set<string>,
): TimeFieldConfig[] => {
  let overrides: ReturnType<typeof getCatalogSnapshot>['timeFieldOverrides'] = [];
  try {
    overrides = getCatalogSnapshot().timeFieldOverrides.filter(o => o.airlineCode === airline);
  } catch { /* ignore */ }
  if (!overrides.length) return fields;

  const overrideMap = new Map(overrides.map(o => [o.fieldKey, o]));
  const present = new Set(fields.map(f => String(f.key)));

  const patched = fields
    .map(f => {
      const ov = overrideMap.get(String(f.key));
      if (!ov) return f;
      if (ov.visible === false) return null;
      return {
        ...f,
        label: ov.label && ov.label.trim() ? ov.label : f.label,
        clockColor: (ov.clockColor as TimeFieldConfig['clockColor']) ?? f.clockColor,
      } as TimeFieldConfig;
    })
    .filter((f): f is TimeFieldConfig => !!f);

  overrides
    .filter(o => o.visible === true && !present.has(o.fieldKey))
    .filter(o => !allowedAppendKeys || allowedAppendKeys.has(o.fieldKey))
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
    .forEach(o => {
      patched.push({
        key: o.fieldKey as keyof TurnaroundTimes,
        label:
          (o.label && o.label.trim()) ||
          TIME_FIELD_FALLBACK_LABELS[o.fieldKey] ||
          o.fieldKey,
        clockColor: (o.clockColor as TimeFieldConfig['clockColor']) ?? 'default',
        type: (o.type as TimeFieldConfig['type']) || 'time',
      });
    });

  return patched;
};

// Get arrival fields for split layout
export const getArrivalFields = (airline: AirlineCode, isRemote: boolean): TimeFieldConfig[] => {
  const hasStairs = AIRLINES_WITH_STAIRS.includes(airline);
  let fields = hasStairs ? [...ARRIVAL_FIELDS_WITH_STAIRS] : [...ARRIVAL_FIELDS_NO_STAIRS];

  if (isRemote) {
    fields.push({ key: 'gpuOn', label: 'Puesta de GPU', type: 'time' });
    fields.push({ key: 'busArrival', label: '1ª Jardinera', type: 'time' });

    if (!hasStairs) {
      const stairsField: TimeFieldConfig = { key: 'stairsTime', label: 'Puesta Escalera', clockColor: 'green', type: 'time' };
      const chocksIdx = fields.findIndex(f => f.key === 'chocksOnArrival');
      fields.splice(chocksIdx + 1, 0, stairsField);
    }
  }

  return applyTimeFieldOverrides(airline, fields, ARRIVAL_ONLY_KEYS as Set<string>);
};

// Get departure fields for split layout
export const getDepartureFields = (airline: AirlineCode, isRemote: boolean): TimeFieldConfig[] => {
  const hasStairs = AIRLINES_WITH_STAIRS.includes(airline) || isRemote;
  let fields = hasStairs ? [...DEPARTURE_FIELDS_WITH_STAIRS] : [...DEPARTURE_FIELDS_NO_STAIRS];

  if (isRemote) {
    fields.splice(fields.length - 1, 0, { key: 'gpuOff', label: 'Retirada de GPU', type: 'time' });
  }

  // Restrict admin-override appended keys when not remote: gpuOff must only
  // appear on remote parkings, regardless of airline-specific overrides.
  const allowedKeys = new Set<string>(DEPARTURE_ONLY_KEYS as Set<string>);
  if (!isRemote) allowedKeys.delete('gpuOff');

  let result = applyTimeFieldOverrides(airline, fields, allowedKeys);
  if (!isRemote) result = result.filter(f => f.key !== 'gpuOff');
  return result;
};

// Fields to keep in "Sólo llegada" mode (arrival only)
const ARRIVAL_ONLY_KEYS: Set<keyof TurnaroundTimes> = new Set([
  'chocksOnArrival',
  'stairsTime',
  'stairsRemovalArrival',
  'unloadingStart',
  'unloadingEnd',
  'firstBag',
  'gpuOn',
  'busArrival',
  'cargoArrival',
  'mailArrival',
  'aviArrival',
]);

// Fields to keep in "Sólo salida" mode (departure only)
const DEPARTURE_ONLY_KEYS: Set<keyof TurnaroundTimes> = new Set([
  'chocksOff',
  'specialEndLoading',
  'loadingStart',
  'loadingEnd',
  'firstBag',
  'lirReception',
  'lastHandBag',
  'dock1',
  'pushBackTime',
  'asu',
  'acu',
  'acuStart',
  'acuEnd',
  'cargoDeparture',
  'mailDeparture',
  'aviDeparture',
  'gpuOff',
  'bagSearchStart',
  'bagSearchEnd',
]);

export const getTimeFieldsForAirline = (airline: AirlineCode, isRemote: boolean, soloLlegada: boolean = false, soloSalida: boolean = false): TimeFieldConfig[] => {
  let baseFields: TimeFieldConfig[];

  if (airline === 'FEDEX') {
    baseFields = [...FIELDS_FEDEX];
  } else if (AIRLINES_WITH_STAIRS.includes(airline)) {
    baseFields = [...FIELDS_WITH_STAIRS];
  } else {
    baseFields = [...FIELDS_NO_STAIRS];
  }

  // Amazon-specific overrides
  if (airline === 'AMAZON') {
    baseFields = baseFields.map(f => {
      if (f.key === 'firstBag') return { ...f, label: 'Envío 1ª Ristra' };
      if (f.key === 'mailArrival') return { key: 'cargoDeparture', label: 'Cargo de Salida', type: 'boolean' } as TimeFieldConfig;
      return f;
    });
  }

  if (isRemote) {
    const remoteToAdd = (airline === 'AMAZON' || airline === 'FEDEX')
      ? REMOTE_FIELDS.filter(f => f.key !== 'busArrival')
      : [...REMOTE_FIELDS];
    baseFields = [...baseFields, ...remoteToAdd];

    if (!AIRLINES_WITH_STAIRS.includes(airline) && airline !== 'FEDEX') {
      baseFields.push(...REMOTE_STAIRS_FIELDS);
    }

    if (airline !== 'FEDEX') {
      const stairsField = baseFields.find(f => f.key === 'stairsTime');
      const retStairsField = baseFields.find(f => f.key === 'specialEndLoading');
      const chocksOffField = baseFields.find(f => f.key === 'chocksOff');
      const rest = baseFields.filter(f => f.key !== 'stairsTime' && f.key !== 'specialEndLoading' && f.key !== 'chocksOff' && f.key !== 'chocksOnArrival');
      const chocksOn = baseFields.find(f => f.key === 'chocksOnArrival');

      if (chocksOn && stairsField && retStairsField && chocksOffField) {
        baseFields = [chocksOn, chocksOffField, stairsField, retStairsField, ...rest];
      }
    }
  }

  if (soloLlegada) {
    baseFields = baseFields.filter(f => ARRIVAL_ONLY_KEYS.has(f.key));
  }

  if (soloSalida) {
    baseFields = baseFields.filter(f => DEPARTURE_ONLY_KEYS.has(f.key));
    if (airline === 'AMAZON') {
      baseFields = baseFields.filter(f => f.key !== 'firstBag');
    }
  }

  return applyTimeFieldOverrides(airline, baseFields);
};

// Airline prefixes for flight numbers
export const AIRLINE_PREFIXES: Record<string, string> = {
  FEDEX: '3V',
  AIR_CANADA: 'AC',
  AIR_CANADA_CARGO: 'AC',
  TRANSAVIA: 'TO',
  WIZZ: 'W',
  TAP: 'TP',
  ITA: 'AZ0',
  NILE_AIR: 'NP',
  AEGEAN: 'A',
  PEGASUS: 'PC',
  SKYEXPRESS: 'GQ',
  SKYUP: 'PQ',
  AMAZON: 'ABR',
  A_JET: 'VF',
  ALBASTAR: 'AP',
  ICELANDAIR: 'FI',
  AZUL: 'AD',
  EUROWINGS: 'EW',
  CROATIA: 'OU',
  AIR_EST: 'AE',
  SIN_MARCA: 'SM',
  WESTJET: 'WS',
};

// Resolves the active prefix for an airline, preferring the admin override
// stored in catalog_airlines.prefix and falling back to the built-in map.
export const getAirlinePrefix = (airline: string | null | undefined): string => {
  if (!airline) return '';
  try {
    const ov = getCatalogSnapshot().airlines.find((a) => a.code === airline);
    if (ov && typeof ov.prefix === 'string' && ov.prefix.trim() !== '') {
      return ov.prefix;
    }
  } catch { /* ignore */ }
  return AIRLINE_PREFIXES[airline] || '';
};

// Cargo/Mail destination per airline (per-flow). Returns null when no aviso should appear.
export const getCargoMailDestination = (
  airline: AirlineCode,
  key: 'cargoArrival' | 'cargoDeparture' | 'mailArrival' | 'mailDeparture'
): string | null => {
  const isCargo = key === 'cargoArrival' || key === 'cargoDeparture';
  const isArrival = key === 'cargoArrival' || key === 'mailArrival';

  const map: Partial<Record<AirlineCode, { cargoArr: string | null; cargoDep: string | null; mailArr: string | null; mailDep: string | null }>> = {
    AEGEAN:           { cargoArr: 'Swissport', cargoDep: 'Swissport', mailArr: 'Swissport', mailDep: 'Swissport' },
    ITA:              { cargoArr: 'Swissport', cargoDep: 'Swissport', mailArr: 'Swissport', mailDep: 'Swissport' },
    TAP:              { cargoArr: 'Swissport', cargoDep: 'Swissport', mailArr: 'Swissport', mailDep: 'Swissport' },
    AMAZON:           { cargoArr: 'ACL',       cargoDep: 'ACL',       mailArr: null,        mailDep: null },
    AIR_CANADA:       { cargoArr: 'WFS1',      cargoDep: 'WFS4',      mailArr: 'Correos',   mailDep: 'Correos' },
    AIR_CANADA_CARGO: { cargoArr: 'WFS1',      cargoDep: 'WFS4',      mailArr: null,        mailDep: null },
    AZUL:             { cargoArr: 'WFS1',      cargoDep: 'WFS1',      mailArr: null,        mailDep: null },
    FEDEX:            { cargoArr: 'FedEx',     cargoDep: 'FedEx',     mailArr: null,        mailDep: null },
    PEGASUS:          { cargoArr: 'WFS2',      cargoDep: 'WFS4',      mailArr: null,        mailDep: null },
    NILE_AIR:         { cargoArr: 'Swissport', cargoDep: 'Swissport', mailArr: null,        mailDep: null },
    SKYEXPRESS:       { cargoArr: 'Swissport', cargoDep: null,        mailArr: null,        mailDep: null },
    A_JET:            { cargoArr: 'Swissport', cargoDep: null,        mailArr: null,        mailDep: null },
    WESTJET:          { cargoArr: 'WFS2',      cargoDep: null,        mailArr: null,        mailDep: null },
  };

  const row = map[airline];
  if (!row) return null;
  if (isCargo) return isArrival ? row.cargoArr : row.cargoDep;
  return isArrival ? row.mailArr : row.mailDep;
};

// Get push back field (shown when pushBack=true and not remote)
export const getPushBackField = (): TimeFieldConfig => ({
  key: 'pushBackTime',
  label: 'Fin Push Back',
  clockColor: 'red',
  type: 'time',
});
