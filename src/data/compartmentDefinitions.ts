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
  holdStyle?: 'default' | 'ita';
  bulk?: boolean;
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
    holdStyle: 'ita',
    holds: [
      { id: createHoldId('ITA', 'a321-11'), label: '11 🚪' },
      { id: createHoldId('ITA', 'a321-12'), label: '12' },
    ],
  },
  {
    id: 'ita-a321-comp2',
    airline: 'ITA',
    compartmentName: 'COMPARTIMIENTO 2',
    holdStyle: 'ita',
    holds: [
      { id: createHoldId('ITA', 'a321-21'), label: '21' },
      { id: createHoldId('ITA', 'a321-22'), label: '22' },
      { id: createHoldId('ITA', 'a321-23'), label: '23' },
    ],
  },
  {
    id: 'ita-a321-comp3',
    airline: 'ITA',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holdStyle: 'ita',
    holds: [
      { id: createHoldId('ITA', 'a321-31'), label: '31' },
      { id: createHoldId('ITA', 'a321-32'), label: '32' },
      { id: createHoldId('ITA', 'a321-33'), label: '33' },
    ],
  },
  {
    id: 'ita-a321-comp4',
    airline: 'ITA',
    compartmentName: 'COMPARTIMIENTO 4',
    holdStyle: 'ita',
    holds: [
      { id: createHoldId('ITA', 'a321-41'), label: '41 🚪' },
      { id: createHoldId('ITA', 'a321-42'), label: '42' },
    ],
  },
  {
    id: 'ita-a321-bulk5',
    airline: 'ITA',
    compartmentName: 'Bulk 5',
    holds: [
      { id: createHoldId('ITA', 'a321-51'), label: '51' },
      { id: createHoldId('ITA', 'a321-52'), label: '52 🚪' },
      { id: createHoldId('ITA', 'a321-53'), label: '53' },
    ],
  },
];

// ITA Airways A320
export const ITA_A320_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'ita-a320-comp1',
    airline: 'ITA',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holdStyle: 'ita',
    holds: [
      { id: createHoldId('ITA', 'a320-11'), label: '11 🚪' },
      { id: createHoldId('ITA', 'a320-12'), label: '12' },
      { id: createHoldId('ITA', 'a320-13'), label: '13' },
    ],
  },
  {
    id: 'ita-a320-comp3',
    airline: 'ITA',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holdStyle: 'ita',
    holds: [
      { id: createHoldId('ITA', 'a320-31'), label: '31' },
      { id: createHoldId('ITA', 'a320-32'), label: '32' },
    ],
  },
  {
    id: 'ita-a320-comp4',
    airline: 'ITA',
    compartmentName: 'COMPARTIMIENTO 4',
    holdStyle: 'ita',
    holds: [
      { id: createHoldId('ITA', 'a320-41'), label: '41 🚪' },
      { id: createHoldId('ITA', 'a320-42'), label: '42' },
    ],
  },
  {
    id: 'ita-a320-bulk',
    airline: 'ITA',
    compartmentName: 'Bulk',
    holds: [
      { id: createHoldId('ITA', 'a320-5'), label: '5 🚪' },
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
      { id: createHoldId('TRANSAVIA', 'a320-1'), label: 'Bodega 1' },
    ],
  },
  {
    id: 'transavia-a320-comp3',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a320-3'), label: 'Bodega 3' },
    ],
  },
  {
    id: 'transavia-a320-comp4',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a320-4'), label: 'Bodega 4' },
    ],
  },
  {
    id: 'transavia-a320-comp5',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 5',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a320-5'), label: 'Bodega 5' },
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
    expandable: true,
    expandableDefault: 5,
  },
];

// A Jet (same layout as Transavia)
export const A_JET_A320_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'ajet-a320-comp1', airline: 'A_JET', compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('A_JET', 'a320-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('A_JET', 'a320-12'), label: 'Bodega 12' },
    ],
  },
  {
    id: 'ajet-a320-comp3', airline: 'A_JET', compartmentName: 'COMPARTIMIENTO 3 AFT (hasta 90 maletas)',
    holds: [
      { id: createHoldId('A_JET', 'a320-31'), label: 'Bodega 31' },
      { id: createHoldId('A_JET', 'a320-32'), label: 'Bodega 32' },
      { id: createHoldId('A_JET', 'a320-33'), label: 'Bodega 33' },
    ],
  },
  {
    id: 'ajet-a320-comp4', airline: 'A_JET', compartmentName: 'COMPARTIMIENTO 4 (Resto aquí)',
    holds: [
      { id: createHoldId('A_JET', 'a320-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('A_JET', 'a320-42'), label: 'Bodega 42' },
    ],
  },
  {
    id: 'ajet-a320-bulk5', airline: 'A_JET', compartmentName: 'Bulk 5',
    holds: [
      { id: createHoldId('A_JET', 'a320-51'), label: 'Bodega 51' },
    ],
  },
];

export const A_JET_A321_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'ajet-a321-comp1', airline: 'A_JET', compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('A_JET', 'a321-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('A_JET', 'a321-12'), label: 'Bodega 12' },
      { id: createHoldId('A_JET', 'a321-13'), label: 'Bodega 13' },
    ],
  },
  {
    id: 'ajet-a321-comp3', airline: 'A_JET', compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('A_JET', 'a321-31'), label: 'Bodega 31' },
      { id: createHoldId('A_JET', 'a321-32'), label: 'Bodega 32' },
    ],
  },
  {
    id: 'ajet-a321-comp4', airline: 'A_JET', compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('A_JET', 'a321-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('A_JET', 'a321-42'), label: 'Bodega 42' },
    ],
  },
  {
    id: 'ajet-a321-bulk', airline: 'A_JET', compartmentName: 'Bulk',
    holds: [
      { id: createHoldId('A_JET', 'a321-5'), label: 'Bodega 5 🚪' },
    ],
  },
];

export const A_JET_737_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'ajet-737-comp1', airline: 'A_JET', compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('A_JET', '737-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('A_JET', '737-12'), label: 'Bodega 12' },
      { id: createHoldId('A_JET', '737-13'), label: 'Bodega 13' },
    ],
  },
  {
    id: 'ajet-737-comp3', airline: 'A_JET', compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('A_JET', '737-31'), label: 'Bodega 31' },
      { id: createHoldId('A_JET', '737-32'), label: 'Bodega 32' },
    ],
  },
  {
    id: 'ajet-737-comp4', airline: 'A_JET', compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('A_JET', '737-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('A_JET', '737-42'), label: 'Bodega 42' },
    ],
  },
  {
    id: 'ajet-737-bulk', airline: 'A_JET', compartmentName: 'Bulk',
    holds: [
      { id: createHoldId('A_JET', '737-5'), label: 'Bodega 5 🚪' },
    ],
  },
];

export const A_JET_A320_AIRBALTIC_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'ajet-a320ab-comp1', airline: 'A_JET', compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('A_JET', 'a320ab-1'), label: 'Bodega 1 🚪' },
      { id: createHoldId('A_JET', 'a320ab-2'), label: 'Bodega 2' },
    ],
  },
  {
    id: 'ajet-a320ab-comp3', airline: 'A_JET', compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('A_JET', 'a320ab-3'), label: 'Bodega 3' },
    ],
  },
  {
    id: 'ajet-a320ab-comp4', airline: 'A_JET', compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('A_JET', 'a320ab-4'), label: 'Bodega 4 🚪' },
    ],
  },
];

// TAP Air Portugal EMB90
export const TAP_EMB90_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'tap-emb90-comp1', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 1 - FWD', bulk: true,
    holds: [
      { id: createHoldId('TAP', 'emb90-11'), label: 'Bodega 1 🚪' },
    ],
  },
  {
    id: 'tap-emb90-comp2', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 2', bulk: true,
    holds: [
      { id: createHoldId('TAP', 'emb90-21'), label: 'Bodega 2' },
    ],
  },
  {
    id: 'tap-emb90-comp3', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 3 AFT', bulk: true,
    holds: [
      { id: createHoldId('TAP', 'emb90-31'), label: 'Bodega 3' },
    ],
  },
  {
    id: 'tap-emb90-comp4', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 4', bulk: true,
    holds: [
      { id: createHoldId('TAP', 'emb90-41'), label: 'Bodega 4 🚪' },
    ],
  },
];

// TAP Air Portugal EMB95
export const TAP_EMB95_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'tap-emb95-comp1', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 1 - FWD', bulk: true,
    holds: [
      { id: createHoldId('TAP', 'emb95-11'), label: 'Bodega 1 🚪' },
    ],
  },
  {
    id: 'tap-emb95-comp2', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 2', bulk: true,
    holds: [
      { id: createHoldId('TAP', 'emb95-21'), label: 'Bodega 2' },
    ],
  },
  {
    id: 'tap-emb95-comp3', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 3 AFT', bulk: true,
    holds: [
      { id: createHoldId('TAP', 'emb95-31'), label: 'Bodega 3' },
    ],
  },
  {
    id: 'tap-emb95-comp4', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 4', bulk: true,
    holds: [
      { id: createHoldId('TAP', 'emb95-41'), label: 'Bodega 4 🚪' },
    ],
  },
];

// TAP Air Portugal A321
export const TAP_A321_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'tap-a321-comp1', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 1 FWD', holdStyle: 'ita',
    holds: [
      { id: createHoldId('TAP', 'a321-11'), label: '11 🚪' },
      { id: createHoldId('TAP', 'a321-12'), label: '12' },
    ],
  },
  {
    id: 'tap-a321-comp2', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 2', holdStyle: 'ita',
    holds: [
      { id: createHoldId('TAP', 'a321-21'), label: '21' },
      { id: createHoldId('TAP', 'a321-22'), label: '22' },
      { id: createHoldId('TAP', 'a321-23'), label: '23' },
    ],
  },
  {
    id: 'tap-a321-comp3', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 3 AFT', holdStyle: 'ita',
    holds: [
      { id: createHoldId('TAP', 'a321-31'), label: '31' },
      { id: createHoldId('TAP', 'a321-32'), label: '32' },
      { id: createHoldId('TAP', 'a321-33'), label: '33' },
    ],
  },
  {
    id: 'tap-a321-comp4', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 4', holdStyle: 'ita',
    holds: [
      { id: createHoldId('TAP', 'a321-41'), label: '41 🚪' },
      { id: createHoldId('TAP', 'a321-42'), label: '42' },
    ],
  },
  {
    id: 'tap-a321-bulk5', airline: 'TAP', compartmentName: 'Bulk 5',
    holds: [
      { id: createHoldId('TAP', 'a321-51'), label: '51' },
      { id: createHoldId('TAP', 'a321-52'), label: '52 🚪' },
      { id: createHoldId('TAP', 'a321-53'), label: '53' },
    ],
  },
];

// TAP Air Portugal A320
export const TAP_A320_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'tap-a320-comp1', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 1 FWD', holdStyle: 'ita',
    holds: [
      { id: createHoldId('TAP', 'a320-11'), label: '11 🚪' },
      { id: createHoldId('TAP', 'a320-12'), label: '12' },
      { id: createHoldId('TAP', 'a320-13'), label: '13' },
    ],
  },
  {
    id: 'tap-a320-comp3', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 3 AFT', holdStyle: 'ita',
    holds: [
      { id: createHoldId('TAP', 'a320-31'), label: '31' },
      { id: createHoldId('TAP', 'a320-32'), label: '32' },
    ],
  },
  {
    id: 'tap-a320-comp4', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 4', holdStyle: 'ita',
    holds: [
      { id: createHoldId('TAP', 'a320-41'), label: '41 🚪' },
      { id: createHoldId('TAP', 'a320-42'), label: '42' },
    ],
  },
  {
    id: 'tap-a320-bulk', airline: 'TAP', compartmentName: 'Bulk',
    holds: [
      { id: createHoldId('TAP', 'a320-5'), label: '5 🚪' },
    ],
  },
];

// Nile Air A321
export const NILE_AIR_A321_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'nileair-a321-comp1',
    airline: 'NILE_AIR',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('NILE_AIR', 'a321-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('NILE_AIR', 'a321-12'), label: 'Bodega 12' },
    ],
  },
  {
    id: 'nileair-a321-comp3',
    airline: 'NILE_AIR',
    compartmentName: 'COMPARTIMIENTO 3 AFT (hasta 90 maletas)',
    holds: [
      { id: createHoldId('NILE_AIR', 'a321-31'), label: 'Bodega 31' },
      { id: createHoldId('NILE_AIR', 'a321-32'), label: 'Bodega 32' },
      { id: createHoldId('NILE_AIR', 'a321-33'), label: 'Bodega 33' },
    ],
  },
  {
    id: 'nileair-a321-comp4',
    airline: 'NILE_AIR',
    compartmentName: 'COMPARTIMIENTO 4 (Resto aquí)',
    holds: [
      { id: createHoldId('NILE_AIR', 'a321-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('NILE_AIR', 'a321-42'), label: 'Bodega 42' },
    ],
  },
  {
    id: 'nileair-a321-bulk5',
    airline: 'NILE_AIR',
    compartmentName: 'Bulk 5',
    holds: [
      { id: createHoldId('NILE_AIR', 'a321-51'), label: 'Bodega 51' },
    ],
  },
];

// Nile Air A320
export const NILE_AIR_A320_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'nileair-a320-comp1',
    airline: 'NILE_AIR',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('NILE_AIR', 'a320-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('NILE_AIR', 'a320-12'), label: 'Bodega 12' },
      { id: createHoldId('NILE_AIR', 'a320-13'), label: 'Bodega 13' },
    ],
  },
  {
    id: 'nileair-a320-comp3',
    airline: 'NILE_AIR',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('NILE_AIR', 'a320-31'), label: 'Bodega 31' },
      { id: createHoldId('NILE_AIR', 'a320-32'), label: 'Bodega 32' },
    ],
  },
  {
    id: 'nileair-a320-comp4',
    airline: 'NILE_AIR',
    compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('NILE_AIR', 'a320-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('NILE_AIR', 'a320-42'), label: 'Bodega 42' },
    ],
  },
  {
    id: 'nileair-a320-bulk',
    airline: 'NILE_AIR',
    compartmentName: 'Bulk',
    holds: [
      { id: createHoldId('NILE_AIR', 'a320-5'), label: 'Bodega 5 🚪' },
    ],
  },
];

// Sin Marca compartments (reuse common layouts per model)
export const SIN_MARCA_A320_COMPARTMENTS: CompartmentDefinition[] = [
  { id: 'sinmarca-a320-comp1', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('SIN_MARCA', 'a320-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('SIN_MARCA', 'a320-12'), label: 'Bodega 12' },
      { id: createHoldId('SIN_MARCA', 'a320-13'), label: 'Bodega 13' },
    ],
  },
  { id: 'sinmarca-a320-comp3', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('SIN_MARCA', 'a320-31'), label: 'Bodega 31' },
      { id: createHoldId('SIN_MARCA', 'a320-32'), label: 'Bodega 32' },
    ],
  },
  { id: 'sinmarca-a320-comp4', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('SIN_MARCA', 'a320-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('SIN_MARCA', 'a320-42'), label: 'Bodega 42' },
    ],
  },
  { id: 'sinmarca-a320-bulk', airline: 'SIN_MARCA', compartmentName: 'Bulk',
    holds: [
      { id: createHoldId('SIN_MARCA', 'a320-5'), label: 'Bodega 5 🚪' },
    ],
  },
];

export const SIN_MARCA_A321_COMPARTMENTS: CompartmentDefinition[] = [
  { id: 'sinmarca-a321-comp1', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('SIN_MARCA', 'a321-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('SIN_MARCA', 'a321-12'), label: 'Bodega 12' },
    ],
  },
  { id: 'sinmarca-a321-comp3', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('SIN_MARCA', 'a321-31'), label: 'Bodega 31' },
      { id: createHoldId('SIN_MARCA', 'a321-32'), label: 'Bodega 32' },
      { id: createHoldId('SIN_MARCA', 'a321-33'), label: 'Bodega 33' },
    ],
  },
  { id: 'sinmarca-a321-comp4', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('SIN_MARCA', 'a321-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('SIN_MARCA', 'a321-42'), label: 'Bodega 42' },
    ],
  },
  { id: 'sinmarca-a321-bulk5', airline: 'SIN_MARCA', compartmentName: 'Bulk 5',
    holds: [
      { id: createHoldId('SIN_MARCA', 'a321-51'), label: 'Bodega 51' },
    ],
  },
];

export const SIN_MARCA_737_COMPARTMENTS: CompartmentDefinition[] = [
  { id: 'sinmarca-737-comp1', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('SIN_MARCA', '737-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('SIN_MARCA', '737-12'), label: 'Bodega 12' },
      { id: createHoldId('SIN_MARCA', '737-13'), label: 'Bodega 13' },
    ],
  },
  { id: 'sinmarca-737-comp3', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('SIN_MARCA', '737-31'), label: 'Bodega 31' },
      { id: createHoldId('SIN_MARCA', '737-32'), label: 'Bodega 32' },
    ],
  },
  { id: 'sinmarca-737-comp4', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('SIN_MARCA', '737-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('SIN_MARCA', '737-42'), label: 'Bodega 42' },
    ],
  },
  { id: 'sinmarca-737-bulk', airline: 'SIN_MARCA', compartmentName: 'Bulk',
    holds: [
      { id: createHoldId('SIN_MARCA', '737-5'), label: 'Bodega 5 🚪' },
    ],
  },
];

export const SIN_MARCA_EMB_COMPARTMENTS: CompartmentDefinition[] = [
  { id: 'sinmarca-emb-comp1', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 1 - FWD', bulk: true,
    holds: [{ id: createHoldId('SIN_MARCA', 'emb-11'), label: 'Bodega 1 🚪' }],
  },
  { id: 'sinmarca-emb-comp2', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 2', bulk: true,
    holds: [{ id: createHoldId('SIN_MARCA', 'emb-21'), label: 'Bodega 2' }],
  },
  { id: 'sinmarca-emb-comp3', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 3 AFT', bulk: true,
    holds: [{ id: createHoldId('SIN_MARCA', 'emb-31'), label: 'Bodega 3' }],
  },
  { id: 'sinmarca-emb-comp4', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 4', bulk: true,
    holds: [{ id: createHoldId('SIN_MARCA', 'emb-41'), label: 'Bodega 4 🚪' }],
  },
];

export const SIN_MARCA_A333_COMPARTMENTS: CompartmentDefinition[] = [
  { id: 'sinmarca-a333-fwd', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO FWD',
    holds: [
      { id: createHoldId('SIN_MARCA', 'a333-11p'), label: '11 P 🚪' },
      { id: createHoldId('SIN_MARCA', 'a333-12p'), label: '12 P' },
      { id: createHoldId('SIN_MARCA', 'a333-21p'), label: '21 P' },
      { id: createHoldId('SIN_MARCA', 'a333-22p'), label: '22 P' },
      { id: createHoldId('SIN_MARCA', 'a333-23p'), label: '23 P' },
      { id: createHoldId('SIN_MARCA', 'a333-24p'), label: '24 P' },
    ],
  },
  { id: 'sinmarca-a333-aft', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO AFT',
    holds: [
      { id: createHoldId('SIN_MARCA', 'a333-31p'), label: '31 P' },
      { id: createHoldId('SIN_MARCA', 'a333-41'), label: '41' },
      { id: createHoldId('SIN_MARCA', 'a333-42'), label: '42' },
      { id: createHoldId('SIN_MARCA', 'a333-43'), label: '43 🚪' },
    ],
  },
  { id: 'sinmarca-a333-bulk', airline: 'SIN_MARCA', compartmentName: 'Bulk',
    holds: [{ id: createHoldId('SIN_MARCA', 'a333-53'), label: '53 🚪' }],
    expandable: true, expandableDefault: 5,
  },
];

export const SIN_MARCA_GENERIC_COMPARTMENTS: CompartmentDefinition[] = [
  { id: 'sinmarca-gen-comp1', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('SIN_MARCA', 'gen-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('SIN_MARCA', 'gen-12'), label: 'Bodega 12' },
      { id: createHoldId('SIN_MARCA', 'gen-13'), label: 'Bodega 13' },
    ],
  },
  { id: 'sinmarca-gen-comp3', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('SIN_MARCA', 'gen-31'), label: 'Bodega 31' },
      { id: createHoldId('SIN_MARCA', 'gen-32'), label: 'Bodega 32' },
    ],
  },
  { id: 'sinmarca-gen-comp4', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('SIN_MARCA', 'gen-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('SIN_MARCA', 'gen-42'), label: 'Bodega 42' },
    ],
  },
  { id: 'sinmarca-gen-bulk', airline: 'SIN_MARCA', compartmentName: 'Bulk',
    holds: [{ id: createHoldId('SIN_MARCA', 'gen-5'), label: 'Bodega 5 🚪' }],
  },
];

// AlbaStar B737
export const ALBASTAR_B737_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'albastar-b737-comp1', airline: 'ALBASTAR', compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('ALBASTAR', 'b737-1'), label: 'Bodega 1' },
      { id: createHoldId('ALBASTAR', 'b737-2'), label: 'Bodega 2' },
    ],
  },
  {
    id: 'albastar-b737-comp3', airline: 'ALBASTAR', compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('ALBASTAR', 'b737-3'), label: 'Bodega 3' },
      { id: createHoldId('ALBASTAR', 'b737-4'), label: 'Bodega 4' },
    ],
  },
  {
    id: 'albastar-b737-comp5', airline: 'ALBASTAR', compartmentName: 'COMPARTIMIENTO 5',
    holds: [
      { id: createHoldId('ALBASTAR', 'b737-5'), label: 'Bodega 5' },
    ],
  },
];

// Pegasus A321
export const PEGASUS_A321_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'pegasus-a321-comp1', airline: 'PEGASUS', compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('PEGASUS', 'a321-11'), label: 'Bodega 1 🚪' },
      { id: createHoldId('PEGASUS', 'a321-12'), label: 'Bodega 2' },
    ],
  },
  {
    id: 'pegasus-a321-comp3', airline: 'PEGASUS', compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('PEGASUS', 'a321-31'), label: 'Bodega 3' },
    ],
  },
  {
    id: 'pegasus-a321-comp4', airline: 'PEGASUS', compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('PEGASUS', 'a321-41'), label: 'Bodega 4 🚪' },
    ],
  },
  {
    id: 'pegasus-a321-bulk5', airline: 'PEGASUS', compartmentName: 'Bulk 5',
    holds: [
      { id: createHoldId('PEGASUS', 'a321-51'), label: 'Bodega 5' },
    ],
  },
];

// Croatia Airlines A220-300
export const CROATIA_A220_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'croatia-a220-comp0', airline: 'CROATIA', compartmentName: 'COMPARTIMIENTO 0',
    holds: [{ id: createHoldId('CROATIA', 'a220-0'), label: 'Bodega 0' }],
  },
  {
    id: 'croatia-a220-comp1', airline: 'CROATIA', compartmentName: 'COMPARTIMIENTO 1',
    holds: [{ id: createHoldId('CROATIA', 'a220-1'), label: 'Bodega 1' }],
  },
  {
    id: 'croatia-a220-comp2', airline: 'CROATIA', compartmentName: 'COMPARTIMIENTO 2',
    holds: [{ id: createHoldId('CROATIA', 'a220-2'), label: 'Bodega 2' }],
  },
  {
    id: 'croatia-a220-comp4', airline: 'CROATIA', compartmentName: 'COMPARTIMIENTO 4',
    holds: [{ id: createHoldId('CROATIA', 'a220-4'), label: 'Bodega 4' }],
  },
];


export const ITA_STYLE_TYPE_OPTIONS: Record<string, string[]> = {
  ITA: ['AKH-AZ', 'PKC-AZ'],
  TAP: ['AKH-TP', 'PKC-TP'],
};

export const getCompartmentsByAirline = (airline: AirlineCode, aircraftModel?: string): CompartmentDefinition[] => {
  if (airline === 'SKYEXPRESS') return SKYEXPRESS_COMPARTMENTS;
  if (airline === 'TAP') {
    if (aircraftModel === 'EMB90') return TAP_EMB90_COMPARTMENTS;
    if (aircraftModel === 'EMB95') return TAP_EMB95_COMPARTMENTS;
    if (aircraftModel === 'A321') return TAP_A321_COMPARTMENTS;
    if (aircraftModel === 'A320') return TAP_A320_COMPARTMENTS;
    return [];
  }
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
  if (airline === 'A_JET') {
    if (aircraftModel === 'A320') return A_JET_A320_COMPARTMENTS;
    if (aircraftModel === 'A321') return A_JET_A321_COMPARTMENTS;
    if (aircraftModel === '737-800') return A_JET_737_COMPARTMENTS;
    if (aircraftModel === 'A320_AIRBALTIC') return A_JET_A320_AIRBALTIC_COMPARTMENTS;
    return [];
  }
  if (airline === 'NILE_AIR') {
    if (aircraftModel === 'A321') return NILE_AIR_A321_COMPARTMENTS;
    if (aircraftModel === 'A320') return NILE_AIR_A320_COMPARTMENTS;
    return [];
  }
  if (airline === 'SIN_MARCA') {
    if (aircraftModel === 'A320' || aircraftModel === 'A319' || aircraftModel === 'A220') return SIN_MARCA_A320_COMPARTMENTS;
    if (aircraftModel === 'A321') return SIN_MARCA_A321_COMPARTMENTS;
    if (aircraftModel === '737-800' || aircraftModel === 'B737' || aircraftModel === 'B734') return SIN_MARCA_737_COMPARTMENTS;
    if (aircraftModel === 'EMB90' || aircraftModel === 'EMB95') return SIN_MARCA_EMB_COMPARTMENTS;
    if (aircraftModel === 'A333') return SIN_MARCA_A333_COMPARTMENTS;
    if (aircraftModel === 'B777' || aircraftModel === '787-800' || aircraftModel === '787-900' || aircraftModel === 'B767' || aircraftModel === 'A339') return SIN_MARCA_A333_COMPARTMENTS;
    return SIN_MARCA_GENERIC_COMPARTMENTS;
  }
  if (airline === 'ALBASTAR') {
    if (aircraftModel === 'B737') return ALBASTAR_B737_COMPARTMENTS;
    return [];
  }
  if (airline === 'CROATIA') {
    if (aircraftModel === 'A220-300') return CROATIA_A220_COMPARTMENTS;
    return [];
  }
  if (airline === 'EUROWINGS') {
    if (aircraftModel === 'A321') return WIZZ_A321_COMPARTMENTS.map(c => ({ ...c, id: c.id.replace('wizz', 'eurowings'), airline: 'EUROWINGS' as AirlineCode }));
    if (aircraftModel === 'A320') return WIZZ_A320_COMPARTMENTS.map(c => ({ ...c, id: c.id.replace('wizz', 'eurowings'), airline: 'EUROWINGS' as AirlineCode }));
    return [];
  }
  if (airline === 'PEGASUS') {
    if (aircraftModel === 'A321') return PEGASUS_A321_COMPARTMENTS;
    return SKYEXPRESS_COMPARTMENTS;
  }
  // Demo: usar compartimientos de Sky Express para las demás aerolíneas
  return SKYEXPRESS_COMPARTMENTS;
};
