// Types for Turnaround (Scale) Management

export type AirlineCode = 'TAP' | 'WIZZ' | 'ITA' | 'AEGEAN' | 'PEGASUS' | 'TRANSAVIA' | 'SKYEXPRESS' | 'FEDEX' | 'AIR_CANADA' | 'ALBASTAR' | 'ICELANDAIR' | 'AZUL' | 'AMAZON' | 'A_JET';

export interface TurnaroundTimes {
  lirReception: string | null;           // Recepción de LIR
  chocksOnArrival: string | null;        // Calzos Llegada
  stairsTime: string | null;             // Puesta de Escalera
  unloadingStart: string | null;         // Inicio Descarga
  unloadingEnd: string | null;           // Fin Descarga
  loadingStart: string | null;           // Inicio Carga
  loadingEnd: string | null;             // Fin Carga
  lastHandBag: string | null;            // Última de mano
  specialEndLoading: string | null;      // Retirada Escalera
  chocksOff: string | null;              // Retirada Calzos
  busArrival: string | null;             // Llegada Jardinera
  lastBus: string | null;                // Ultima Jardinera
  cargoArrival: boolean;                 // Cargo de llegada
  cargoDeparture: boolean;               // Cargo de salida
  firstBag: string | null;               // 1ª Maleta
  gpuOn: string | null;                  // Puesta de GPU
  gpuOff: string | null;                 // Retirada de GPU
  mailArrival: boolean;                  // Correo Llegada
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
  loadingSheetUrl: string | null;       // Hoja de carga (foto)
  fileUrl: string | null;               // File (archivo adjunto)
  observationPhotos: string[];          // Fotos de observaciones (máx 7)
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
  { code: 'FEDEX', name: 'FedEx', shortName: 'FEDEX', color: 'hsl(270, 60%, 45%)' },
  { code: 'ICELANDAIR', name: 'Icelandair', shortName: 'ICELANDAIR', color: 'hsl(210, 60%, 45%)' },
  { code: 'ITA', name: 'ITA Airways', shortName: 'ITA', color: 'hsl(210, 100%, 52%)' },
  { code: 'PEGASUS', name: 'Pegasus Airlines', shortName: 'PEGASUS', color: 'hsl(30, 90%, 50%)' },
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

// Base fields for TAP/AEGEAN/ITA (with stairs)
const FIELDS_WITH_STAIRS: TimeFieldConfig[] = [
  { key: 'chocksOnArrival', label: 'Calzos Llegada', clockColor: 'green', type: 'time' },
  { key: 'chocksOff', label: 'Retirada Calzos', clockColor: 'red', type: 'time' },
  { key: 'stairsTime', label: 'Puesta Escalera', clockColor: 'green', type: 'time' },
  { key: 'specialEndLoading', label: 'Retirada Escalera', clockColor: 'red', type: 'time' },
  { key: 'unloadingStart', label: 'Inicio Descarga', clockColor: 'green', type: 'time' },
  { key: 'unloadingEnd', label: 'Fin Descarga', clockColor: 'red', type: 'time' },
  { key: 'loadingStart', label: 'Inicio Carga', clockColor: 'green', type: 'time' },
  { key: 'loadingEnd', label: 'Fin Carga', clockColor: 'red', type: 'time' },
  { key: 'firstBag', label: '1ª Maleta', clockColor: 'green', type: 'time' },
  { key: 'lastHandBag', label: 'Última de mano', clockColor: 'red', type: 'time' },
  { key: 'lirReception', label: 'Recepción de LIR', type: 'time' },
  { key: 'dock1', label: '1ª Muelle', clockColor: 'green', type: 'time' },
  { key: 'cargoArrival', label: 'Cargo Llegada', type: 'boolean' },
  { key: 'mailArrival', label: 'Correo Llegada', type: 'boolean' },
  { key: 'asu', label: 'ASU', type: 'boolean-text' },
];

// Fields without stairs (WIZZ, PEGASUS, TRANSAVIA, SKYEXPRESS)
const FIELDS_NO_STAIRS: TimeFieldConfig[] = [
  { key: 'chocksOnArrival', label: 'Calzos Llegada', clockColor: 'green', type: 'time' },
  { key: 'chocksOff', label: 'Retirada Calzos', clockColor: 'red', type: 'time' },
  { key: 'unloadingStart', label: 'Inicio Descarga', clockColor: 'green', type: 'time' },
  { key: 'unloadingEnd', label: 'Fin Descarga', clockColor: 'red', type: 'time' },
  { key: 'loadingStart', label: 'Inicio Carga', clockColor: 'green', type: 'time' },
  { key: 'loadingEnd', label: 'Fin Carga', clockColor: 'red', type: 'time' },
  { key: 'firstBag', label: '1ª Maleta', clockColor: 'green', type: 'time' },
  { key: 'lastHandBag', label: 'Última de mano', clockColor: 'red', type: 'time' },
  { key: 'lirReception', label: 'Recepción de LIR', type: 'time' },
  { key: 'dock1', label: '1ª Muelle', clockColor: 'green', type: 'time' },
  { key: 'cargoArrival', label: 'Cargo Llegada', type: 'boolean' },
  { key: 'mailArrival', label: 'Correo Llegada', type: 'boolean' },
  { key: 'asu', label: 'ASU', type: 'boolean-text' },
];

// FedEx-specific fields (same order as stairs airlines, no cargo/mail/1ª Maleta)
const FIELDS_FEDEX: TimeFieldConfig[] = [
  { key: 'chocksOnArrival', label: 'Calzos Llegada', clockColor: 'green', type: 'time' },
  { key: 'chocksOff', label: 'Retirada Calzos', clockColor: 'red', type: 'time' },
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
  { key: 'busArrival', label: 'Llegada Jardinera', type: 'time' },
  { key: 'lastBus', label: 'Última Jardinera', type: 'time' },
];

const REMOTE_STAIRS_FIELDS: TimeFieldConfig[] = [
  { key: 'stairsTime', label: 'Puesta Escalera', clockColor: 'green', type: 'time' },
  { key: 'specialEndLoading', label: 'Retirada Escalera', clockColor: 'red', type: 'time' },
];

const AIRLINES_WITH_STAIRS: AirlineCode[] = ['TAP', 'AEGEAN', 'ITA', 'AIR_CANADA', 'AZUL', 'AMAZON'];

export const getTimeFieldsForAirline = (airline: AirlineCode, isRemote: boolean): TimeFieldConfig[] => {
  let baseFields: TimeFieldConfig[];

  if (airline === 'FEDEX') {
    baseFields = [...FIELDS_FEDEX];
  } else if (AIRLINES_WITH_STAIRS.includes(airline)) {
    baseFields = [...FIELDS_WITH_STAIRS];
  } else {
    baseFields = [...FIELDS_NO_STAIRS];
  }

  if (isRemote) {
    // Add remote fields
    baseFields = [...baseFields, ...REMOTE_FIELDS];

    // Add stairs for airlines that don't normally have them (excluding FEDEX which already has them)
    if (!AIRLINES_WITH_STAIRS.includes(airline) && airline !== 'FEDEX') {
      baseFields.push(...REMOTE_STAIRS_FIELDS);
    }

    // Reorder: Calzos Llegada (1), Puesta Escalera (2), Retirada Escalera (3), Retirada Calzos (4), rest...
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

  return baseFields;
};
