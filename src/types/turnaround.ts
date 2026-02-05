// Types for Turnaround (Scale) Management

export type AirlineCode = 'TAP' | 'WIZZ' | 'ITA' | 'AEGEAN' | 'PEGASUS' | 'TRANSAVIA' | 'SKYEXPRESS';

export interface TurnaroundTimes {
  lirReception: string | null;           // Recepción de LIR
  chocksOnArrival: string | null;        // Calzos Llegada
  stairsTime: string | null;             // Puesta de Escalera
  unloadingStart: string | null;         // Inicio Descarga
  unloadingEnd: string | null;           // Fin Descarga
  loadingStart: string | null;           // Inicio Carga
  loadingEnd: string | null;             // Fin Carga
  specialEndLoading: string | null;      // Retirada Escalera
  chocksOff: string | null;              // Calzos Salida
  busArrival: string | null;             // Llegada Jardinera
  lastBus: string | null;                // Ultima Jardinera
  cargoArrival: boolean;                 // Cargo de llegada
  cargoDeparture: boolean;               // Cargo de salida
  firstBag: string | null;               // 1ª Maleta
  gpuOn: string | null;                  // Puesta de GPU
  gpuOff: string | null;                 // Retirada de GPU
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
  { code: 'TAP', name: 'TAP Air Portugal', shortName: 'TAP', color: 'hsl(142, 76%, 36%)' },
  { code: 'WIZZ', name: 'Wizz Air', shortName: 'WIZZ', color: 'hsl(316, 73%, 52%)' },
  { code: 'ITA', name: 'ITA Airways', shortName: 'ITA', color: 'hsl(210, 100%, 52%)' },
  { code: 'AEGEAN', name: 'Aegean Airlines', shortName: 'AEGEAN', color: 'hsl(200, 80%, 45%)' },
  { code: 'PEGASUS', name: 'Pegasus Airlines', shortName: 'PEGASUS', color: 'hsl(30, 90%, 50%)' },
  { code: 'TRANSAVIA', name: 'Transavia', shortName: 'TRANSAVIA', color: 'hsl(145, 70%, 40%)' },
  { code: 'SKYEXPRESS', name: 'Sky Express', shortName: 'SKY EXPRESS', color: 'hsl(220, 80%, 55%)' },
];
