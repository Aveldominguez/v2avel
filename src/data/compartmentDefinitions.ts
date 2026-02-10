import { AirlineCode } from '@/types/turnaround';

export interface HoldDefinition {
  id: string;
  label: string;
}

export interface PairedHoldDefinition {
  left: HoldDefinition;
  right: HoldDefinition;
}

export type HoldEntry = HoldDefinition | PairedHoldDefinition;

export const isPairedHold = (h: HoldEntry): h is PairedHoldDefinition =>
  'left' in h && 'right' in h;

export interface CompartmentDefinition {
  id: string;
  airline: AirlineCode;
  compartmentName: string;
  holds: HoldEntry[];
  expandable?: boolean;
  expandableDefault?: number;
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

// Wizz Air A321
export const WIZZ_A321_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'wizz-a321-comp1',
    airline: 'WIZZ',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('WIZZ', 'a321-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('WIZZ', 'a321-12'), label: 'Bodega 12' },
    ],
  },
  {
    id: 'wizz-a321-comp3',
    airline: 'WIZZ',
    compartmentName: 'COMPARTIMIENTO 3 AFT (hasta 90 maletas)',
    holds: [
      { id: createHoldId('WIZZ', 'a321-31'), label: 'Bodega 31' },
      { id: createHoldId('WIZZ', 'a321-32'), label: 'Bodega 32' },
      { id: createHoldId('WIZZ', 'a321-33'), label: 'Bodega 33' },
    ],
  },
  {
    id: 'wizz-a321-comp4',
    airline: 'WIZZ',
    compartmentName: 'COMPARTIMIENTO 4 (Resto aquí)',
    holds: [
      { id: createHoldId('WIZZ', 'a321-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('WIZZ', 'a321-42'), label: 'Bodega 42' },
    ],
  },
  {
    id: 'wizz-a321-bulk5',
    airline: 'WIZZ',
    compartmentName: 'Bulk 5',
    holds: [
      { id: createHoldId('WIZZ', 'a321-51'), label: 'Bodega 51' },
    ],
  },
];

// Wizz Air A320
export const WIZZ_A320_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'wizz-a320-comp1',
    airline: 'WIZZ',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('WIZZ', 'a320-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('WIZZ', 'a320-12'), label: 'Bodega 12' },
      { id: createHoldId('WIZZ', 'a320-13'), label: 'Bodega 13' },
    ],
  },
  {
    id: 'wizz-a320-comp3',
    airline: 'WIZZ',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('WIZZ', 'a320-31'), label: 'Bodega 31' },
      { id: createHoldId('WIZZ', 'a320-32'), label: 'Bodega 32' },
    ],
  },
  {
    id: 'wizz-a320-comp4',
    airline: 'WIZZ',
    compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('WIZZ', 'a320-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('WIZZ', 'a320-42'), label: 'Bodega 42' },
    ],
  },
  {
    id: 'wizz-a320-bulk',
    airline: 'WIZZ',
    compartmentName: 'Bulk',
    holds: [
      { id: createHoldId('WIZZ', 'a320-5'), label: 'Bodega 5 🚪' },
    ],
  },
];

// Aegean A320
export const AEGEAN_A320_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'aegean-a320-comp1',
    airline: 'AEGEAN',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('AEGEAN', 'a320-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('AEGEAN', 'a320-12'), label: 'Bodega 12' },
    ],
  },
  {
    id: 'aegean-a320-comp3',
    airline: 'AEGEAN',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('AEGEAN', 'a320-3'), label: 'Bodega 3' },
    ],
  },
  {
    id: 'aegean-a320-comp4',
    airline: 'AEGEAN',
    compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('AEGEAN', 'a320-4'), label: 'Bodega 4 🚪' },
    ],
  },
  {
    id: 'aegean-a320-bulk5',
    airline: 'AEGEAN',
    compartmentName: 'Bulk 5',
    holds: [
      { id: createHoldId('AEGEAN', 'a320-5'), label: 'Bodega 5' },
    ],
  },
];

// Aegean A321
export const AEGEAN_A321_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'aegean-a321-comp1',
    airline: 'AEGEAN',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('AEGEAN', 'a321-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('AEGEAN', 'a321-21'), label: 'Bodega 21' },
    ],
  },
  {
    id: 'aegean-a321-comp3',
    airline: 'AEGEAN',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('AEGEAN', 'a321-31'), label: 'Bodega 31' },
    ],
  },
  {
    id: 'aegean-a321-comp4',
    airline: 'AEGEAN',
    compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('AEGEAN', 'a321-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('AEGEAN', 'a321-42'), label: 'Bodega 42' },
    ],
  },
  {
    id: 'aegean-a321-bulk5',
    airline: 'AEGEAN',
    compartmentName: 'Bulk 5',
    holds: [
      { id: createHoldId('AEGEAN', 'a321-5'), label: 'Bodega 5' },
    ],
  },
];

// Transavia A320
export const TRANSAVIA_A320_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'transavia-a320-comp1',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a320-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('TRANSAVIA', 'a320-12'), label: 'Bodega 12' },
    ],
  },
  {
    id: 'transavia-a320-comp3',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 3 AFT (hasta 90 maletas)',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a320-31'), label: 'Bodega 31' },
      { id: createHoldId('TRANSAVIA', 'a320-32'), label: 'Bodega 32' },
      { id: createHoldId('TRANSAVIA', 'a320-33'), label: 'Bodega 33' },
    ],
  },
  {
    id: 'transavia-a320-comp4',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 4 (Resto aquí)',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a320-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('TRANSAVIA', 'a320-42'), label: 'Bodega 42' },
    ],
  },
  {
    id: 'transavia-a320-bulk5',
    airline: 'TRANSAVIA',
    compartmentName: 'Bulk 5',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a320-51'), label: 'Bodega 51' },
    ],
  },
];

// Transavia A321
export const TRANSAVIA_A321_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'transavia-a321-comp1',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a321-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('TRANSAVIA', 'a321-12'), label: 'Bodega 12' },
      { id: createHoldId('TRANSAVIA', 'a321-13'), label: 'Bodega 13' },
    ],
  },
  {
    id: 'transavia-a321-comp3',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a321-31'), label: 'Bodega 31' },
      { id: createHoldId('TRANSAVIA', 'a321-32'), label: 'Bodega 32' },
    ],
  },
  {
    id: 'transavia-a321-comp4',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a321-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('TRANSAVIA', 'a321-42'), label: 'Bodega 42' },
    ],
  },
  {
    id: 'transavia-a321-bulk',
    airline: 'TRANSAVIA',
    compartmentName: 'Bulk',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a321-5'), label: 'Bodega 5 🚪' },
    ],
  },
];

// Transavia 737-800
export const TRANSAVIA_737_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'transavia-737-comp1',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('TRANSAVIA', '737-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('TRANSAVIA', '737-12'), label: 'Bodega 12' },
      { id: createHoldId('TRANSAVIA', '737-13'), label: 'Bodega 13' },
    ],
  },
  {
    id: 'transavia-737-comp3',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('TRANSAVIA', '737-31'), label: 'Bodega 31' },
      { id: createHoldId('TRANSAVIA', '737-32'), label: 'Bodega 32' },
    ],
  },
  {
    id: 'transavia-737-comp4',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('TRANSAVIA', '737-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('TRANSAVIA', '737-42'), label: 'Bodega 42' },
    ],
  },
  {
    id: 'transavia-737-bulk',
    airline: 'TRANSAVIA',
    compartmentName: 'Bulk',
    holds: [
      { id: createHoldId('TRANSAVIA', '737-5'), label: 'Bodega 5 🚪' },
    ],
  },
];

// Transavia A320 airBaltic
export const TRANSAVIA_A320_AIRBALTIC_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'transavia-a320ab-comp1',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a320ab-1'), label: 'Bodega 1 🚪' },
      { id: createHoldId('TRANSAVIA', 'a320ab-2'), label: 'Bodega 2' },
    ],
  },
  {
    id: 'transavia-a320ab-comp3',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a320ab-3'), label: 'Bodega 3' },
    ],
  },
  {
    id: 'transavia-a320ab-comp4',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a320ab-4'), label: 'Bodega 4 🚪' },
    ],
  },
];

// Air Canada A333
export const AIR_CANADA_A333_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'aircanada-a333-fwd',
    airline: 'AIR_CANADA',
    compartmentName: 'COMPARTIMIENTO FWD',
    holds: [
      { id: createHoldId('AIR_CANADA', 'a333-11p'), label: '11 P 🚪' },
      { id: createHoldId('AIR_CANADA', 'a333-12p'), label: '12 P' },
      { id: createHoldId('AIR_CANADA', 'a333-21p'), label: '21 P' },
      { id: createHoldId('AIR_CANADA', 'a333-22p'), label: '22 P' },
      { id: createHoldId('AIR_CANADA', 'a333-23p'), label: '23 P' },
      { id: createHoldId('AIR_CANADA', 'a333-24p'), label: '24 P' },
    ],
  },
  {
    id: 'aircanada-a333-aft',
    airline: 'AIR_CANADA',
    compartmentName: 'COMPARTIMIENTO AFT',
    holds: [
      { id: createHoldId('AIR_CANADA', 'a333-31p'), label: '31 P' },
      {
        left: { id: createHoldId('AIR_CANADA', 'a333-32l'), label: '32 L' },
        right: { id: createHoldId('AIR_CANADA', 'a333-32r'), label: '32 R' },
      },
      {
        left: { id: createHoldId('AIR_CANADA', 'a333-33l'), label: '33 L' },
        right: { id: createHoldId('AIR_CANADA', 'a333-33r'), label: '33 R' },
      },
      {
        left: { id: createHoldId('AIR_CANADA', 'a333-34l'), label: '34 L' },
        right: { id: createHoldId('AIR_CANADA', 'a333-34r'), label: '34 R' },
      },
      {
        left: { id: createHoldId('AIR_CANADA', 'a333-41l'), label: '41 L' },
        right: { id: createHoldId('AIR_CANADA', 'a333-41r'), label: '41 R' },
      },
      {
        left: { id: createHoldId('AIR_CANADA', 'a333-42l'), label: '42 L' },
        right: { id: createHoldId('AIR_CANADA', 'a333-42r'), label: '42 R' },
      },
      {
        left: { id: createHoldId('AIR_CANADA', 'a333-43l'), label: '43 L 🚪' },
        right: { id: createHoldId('AIR_CANADA', 'a333-43r'), label: '43 R 🚪' },
      },
      { id: createHoldId('AIR_CANADA', 'a333-44ake'), label: '44 AKE' },
    ],
  },
  {
    id: 'aircanada-a333-bulk',
    airline: 'AIR_CANADA',
    compartmentName: 'Bulk',
    holds: [
      { id: createHoldId('AIR_CANADA', 'a333-53'), label: '53 🚪' },
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
  if (airline === 'WIZZ') {
    if (aircraftModel === 'A321') return WIZZ_A321_COMPARTMENTS;
    if (aircraftModel === 'A320') return WIZZ_A320_COMPARTMENTS;
    return [];
  }
  if (airline === 'AIR_CANADA') {
    if (aircraftModel === 'A333') return AIR_CANADA_A333_COMPARTMENTS;
    return [];
  }
  if (airline === 'AEGEAN') {
    if (aircraftModel === 'A320') return AEGEAN_A320_COMPARTMENTS;
    if (aircraftModel === 'A321') return AEGEAN_A321_COMPARTMENTS;
    return [];
  }
  if (airline === 'TRANSAVIA') {
    if (aircraftModel === 'A320') return TRANSAVIA_A320_COMPARTMENTS;
    if (aircraftModel === 'A321') return TRANSAVIA_A321_COMPARTMENTS;
    if (aircraftModel === '737-800') return TRANSAVIA_737_COMPARTMENTS;
    if (aircraftModel === 'A320_AIRBALTIC') return TRANSAVIA_A320_AIRBALTIC_COMPARTMENTS;
    return [];
  }
  // Demo: usar compartimientos de Sky Express para las demás aerolíneas
  return SKYEXPRESS_COMPARTMENTS;
};
