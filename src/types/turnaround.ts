// Types for Turnaround (Scale) Management

export type AirlineCode = 'TAP' | 'WIZZ' | 'ITA' | 'AEGEAN';

export interface TurnaroundTimes {
  chocksOnArrival: string | null;       // Calzos Llegada
  stairsTime: string | null;             // Puesta de Escalera
  unloadingStart: string | null;         // Inicio Descarga
  unloadingEnd: string | null;           // Fin Descarga
  loadingStart: string | null;           // Inicio Carga
  loadingEnd: string | null;             // Fin Carga
  specialEndLoading: string | null;      // Fin carga ITA-BG/TAP,AEGEAN-BW
  chocksOff: string | null;              // Calzos Salida
  busArrival: string | null;             // Llegada Jardinera
  lastBus: string | null;                // Ultima Jardinera
  cargoArrival: boolean;                 // Cargo de llegada
  cargoDeparture: boolean;               // Cargo de salida
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
];
