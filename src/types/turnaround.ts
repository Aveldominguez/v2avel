// Types for Turnaround (Scale) Management

export type AirlineCode = 'TAP' | 'WIZZ' | 'ITA' | 'AEGEAN' | 'PEGASUS' | 'TRANSAVIA' | 'SKYEXPRESS' | 'FEDEX' | 'AIR_CANADA' | 'ALBASTAR' | 'ICELANDAIR' | 'AZUL' | 'AMAZON' | 'A_JET' | 'NILE_AIR' | 'EUROWINGS' | 'CROATIA' | 'SIN_MARCA';

export interface TurnaroundTimes {
  lirReception: string | null;           // Recepción de LIR
  chocksOnArrival: string | null;        // Calzos Llegada
  stairsTime: string | null;             // Puesta de Escalera
  unloadingStart: string | null;         // Inicio Descarga
  unloadingEnd: string | null;           // Fin Descarga
  loadingStart: string | null;           // Inicio Carga
  loadingEnd: string | null;             // Fin Carga
  lastHandBag: string | null;            // Cierre Coordinador
  specialEndLoading: string | null;      // Retirada Escalera
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
  { code: 'AEGEAN', name: 'Aegean Airlines', shortName: 'AEGEAN', color: 'hsl(200, 80%, 45%)' },
  { code: 'AIR_CANADA', name: 'Air Canada', shortName: 'AIR CANADA', color: 'hsl(0, 70%, 50%)' },
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
  { code: 'TAP', name: 'TAP Air Portugal', shortName: 'TAP', color: 'hsl(142, 76%, 36%)' },
  { code: 'TRANSAVIA', name: 'Transavia', shortName: 'TRANSAVIA', color: 'hsl(145, 70%, 40%)' },
  { code: 'WIZZ', name: 'Wizz Air', shortName: 'WIZZ', color: 'hsl(316, 73%, 52%)' },
];

// Time field configuration for airline-specific rendering
export interface TimeFieldConfig {
  key: keyof TurnaroundTimes;
  label: string;
  clockColor?: 'green' | 'red' | 'default';
  type: 'time' | 'boolean' | 'boolean-text';
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

const AIRLINES_WITH_STAIRS: AirlineCode[] = ['TAP', 'AEGEAN', 'ITA', 'AIR_CANADA', 'AZUL', 'AMAZON', 'PEGASUS', 'SIN_MARCA', 'A_JET'];

// Airlines that use the split layout (all except FedEx and Amazon)
const SPLIT_LAYOUT_EXCLUDED: AirlineCode[] = ['FEDEX', 'AMAZON'];

export const usesSplitLayout = (airline: AirlineCode): boolean => {
  return !SPLIT_LAYOUT_EXCLUDED.includes(airline);
};

// Get arrival fields for split layout
export const getArrivalFields = (airline: AirlineCode, isRemote: boolean): TimeFieldConfig[] => {
  const hasStairs = AIRLINES_WITH_STAIRS.includes(airline);
  let fields = hasStairs ? [...ARRIVAL_FIELDS_WITH_STAIRS] : [...ARRIVAL_FIELDS_NO_STAIRS];

  if (isRemote) {
    // Add GPU On and 1ª Jardinera for remote
    fields.push({ key: 'gpuOn', label: 'Puesta de GPU', type: 'time' });
    fields.push({ key: 'busArrival', label: '1ª Jardinera', type: 'time' });

    // Add stairs for remote airlines that don't normally have them
    if (!hasStairs) {
      // Insert stairs after chocksOnArrival
      const stairsField: TimeFieldConfig = { key: 'stairsTime', label: 'Puesta Escalera', clockColor: 'green', type: 'time' };
      const chocksIdx = fields.findIndex(f => f.key === 'chocksOnArrival');
      fields.splice(chocksIdx + 1, 0, stairsField);
    }
  }

  return fields;
};

// Get departure fields for split layout
export const getDepartureFields = (airline: AirlineCode, isRemote: boolean): TimeFieldConfig[] => {
  const hasStairs = AIRLINES_WITH_STAIRS.includes(airline) || isRemote;
  let fields = hasStairs ? [...DEPARTURE_FIELDS_WITH_STAIRS] : [...DEPARTURE_FIELDS_NO_STAIRS];

  if (isRemote) {
    // Add GPU Off for remote departure
    fields.splice(fields.length - 1, 0, { key: 'gpuOff', label: 'Retirada de GPU', type: 'time' });
  }

  return fields;
};

// Fields to keep in "Sólo llegada" mode (arrival only)
const ARRIVAL_ONLY_KEYS: Set<keyof TurnaroundTimes> = new Set([
  'chocksOnArrival',
  'stairsTime',
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
  'cargoDeparture',
  'mailDeparture',
  'aviDeparture',
  'gpuOff',
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
    baseFields = baseFields.map(f =>
      f.key === 'firstBag' ? { ...f, label: 'Envío 1ª Ristra' } : f
    );
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
    // Amazon: remove firstBag (Envío 1ª Ristra) in arrival-only mode
    if (airline === 'AMAZON') {
      baseFields = baseFields.filter(f => f.key !== 'firstBag');
    }
  }

  if (soloSalida) {
    baseFields = baseFields.filter(f => DEPARTURE_ONLY_KEYS.has(f.key));
  }

  return baseFields;
};

// Airline prefixes for flight numbers
export const AIRLINE_PREFIXES: Record<AirlineCode, string> = {
  FEDEX: '3V',
  AIR_CANADA: 'AC',
  TRANSAVIA: 'TO',
  WIZZ: 'W',
  TAP: 'TP',
  ITA: 'AZ0',
  NILE_AIR: 'NP',
  AEGEAN: 'A',
  PEGASUS: 'PC',
  SKYEXPRESS: 'GQ',
  AMAZON: 'ABR',
  A_JET: 'VF',
  ALBASTAR: 'AP',
  ICELANDAIR: 'FI',
  AZUL: 'AD',
  EUROWINGS: 'EW',
  CROATIA: 'OU',
  SIN_MARCA: 'SM',
};

// Get push back field (shown when pushBack=true and not remote)
export const getPushBackField = (): TimeFieldConfig => ({
  key: 'pushBackTime',
  label: 'Push Back',
  clockColor: 'red',
  type: 'time',
});
