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

export const getCompartmentsByAirline = (airline: AirlineCode): CompartmentDefinition[] => {
  if (airline === 'SKYEXPRESS') return SKYEXPRESS_COMPARTMENTS;
  return [];
};
