import { AirlineCode } from '@/types/turnaround';

export interface CompartmentDefinition {
  id: string;
  airline: AirlineCode;
  compartmentName: string;
  holds: { id: string; label: string }[];
}

const createHoldId = (airline: AirlineCode, hold: string): string =>
  `${airline.toLowerCase()}-hold-${hold.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

export const SKYEXPRESS_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'skyexpress-comp1',
    airline: 'SKYEXPRESS',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('SKYEXPRESS', '11'), label: 'Bodega 11' },
      { id: createHoldId('SKYEXPRESS', '12'), label: 'Bodega 12' },
      { id: createHoldId('SKYEXPRESS', '13'), label: 'Bodega 13' },
    ],
  },
  {
    id: 'skyexpress-comp3',
    airline: 'SKYEXPRESS',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('SKYEXPRESS', '31'), label: 'Bodega 31' },
      { id: createHoldId('SKYEXPRESS', '32'), label: 'Bodega 32' },
    ],
  },
  {
    id: 'skyexpress-comp4',
    airline: 'SKYEXPRESS',
    compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('SKYEXPRESS', '41'), label: 'Bodega 41' },
      { id: createHoldId('SKYEXPRESS', '42'), label: 'Bodega 42' },
    ],
  },
  {
    id: 'skyexpress-comp5',
    airline: 'SKYEXPRESS',
    compartmentName: 'COMPARTIMIENTO 5',
    holds: [
      { id: createHoldId('SKYEXPRESS', '51'), label: 'Bodega 51' },
      { id: createHoldId('SKYEXPRESS', '52'), label: 'Bodega 52' },
      { id: createHoldId('SKYEXPRESS', '53'), label: 'Bodega 53' },
    ],
  },
];

// ITA Airways A321
export const ITA_A321_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'ita-a321-comp1',
    airline: 'ITA',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('ITA', 'a321-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('ITA', 'a321-12'), label: 'Bodega 12' },
      { id: createHoldId('ITA', 'a321-21'), label: 'Bodega 21' },
      { id: createHoldId('ITA', 'a321-22'), label: 'Bodega 22' },
      { id: createHoldId('ITA', 'a321-23'), label: 'Bodega 23' },
    ],
  },
  {
    id: 'ita-a321-comp3',
    airline: 'ITA',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('ITA', 'a321-31'), label: 'Bodega 31' },
      { id: createHoldId('ITA', 'a321-32'), label: 'Bodega 32' },
      { id: createHoldId('ITA', 'a321-33'), label: 'Bodega 33' },
    ],
  },
  {
    id: 'ita-a321-comp4',
    airline: 'ITA',
    compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('ITA', 'a321-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('ITA', 'a321-42'), label: 'Bodega 42' },
    ],
  },
  {
    id: 'ita-a321-bulk5',
    airline: 'ITA',
    compartmentName: 'Bulk 5',
    holds: [
      { id: createHoldId('ITA', 'a321-51'), label: 'Bodega 51' },
      { id: createHoldId('ITA', 'a321-52'), label: 'Bodega 52 🚪' },
      { id: createHoldId('ITA', 'a321-53'), label: 'Bodega 53' },
    ],
  },
];

// ITA Airways A320
export const ITA_A320_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'ita-a320-comp1',
    airline: 'ITA',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('ITA', 'a320-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('ITA', 'a320-12'), label: 'Bodega 12' },
      { id: createHoldId('ITA', 'a320-13'), label: 'Bodega 13' },
    ],
  },
  {
    id: 'ita-a320-comp3',
    airline: 'ITA',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('ITA', 'a320-31'), label: 'Bodega 31' },
      { id: createHoldId('ITA', 'a320-32'), label: 'Bodega 32' },
    ],
  },
  {
    id: 'ita-a320-comp4',
    airline: 'ITA',
    compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('ITA', 'a320-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('ITA', 'a320-42'), label: 'Bodega 42' },
    ],
  },
  {
    id: 'ita-a320-bulk',
    airline: 'ITA',
    compartmentName: 'Bulk',
    holds: [
      { id: createHoldId('ITA', 'a320-5'), label: 'Bodega 5 🚪' },
    ],
  },
];

export const getCompartmentsByAirline = (airline: AirlineCode, aircraftModel?: string): CompartmentDefinition[] => {
  if (airline === 'SKYEXPRESS') return SKYEXPRESS_COMPARTMENTS;
  if (airline === 'ITA') {
    if (aircraftModel === 'A321') return ITA_A321_COMPARTMENTS;
    if (aircraftModel === 'A320') return ITA_A320_COMPARTMENTS;
    return [];
  }
  // Demo: usar compartimientos de Sky Express para las demás aerolíneas
  return SKYEXPRESS_COMPARTMENTS;
};
