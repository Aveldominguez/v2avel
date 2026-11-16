import { AirlineCode } from '@/types/turnaround';
import { getCatalogSnapshot, type HoldOverride } from '@/lib/catalogStore';
import { AIRCRAFT_MODELS } from '@/data/aircraftModels';

/*
 * Posición divisible (aviones de fuselaje ancho).
 *
 * En un 787 la misma sección de la bodega puede ir de dos maneras: un palé
 * que la ocupa entera (13P) o partida en dos mitades con un contenedor en
 * cada una (13L y 13R). La hoja de carga imprime TODAS las opciones y el
 * cargador rellena la que se usa ese día, así que la app no puede fijar una
 * de las dos: tiene que dejar elegir en cada escala.
 *
 * Cada mitad guarda sus datos por separado (`-l-*` y `-r-*`) y el palé los
 * suyos (`-p-*`), de forma que cambiar de modo no pisa lo ya escrito: si se
 * vuelve atrás, lo anterior sigue ahí.
 */
export interface SplitSpec {
  /** Etiqueta cuando va de una pieza, p. ej. '13P'. */
  p: string;
  /** Etiqueta de la mitad izquierda, p. ej. '13L'. */
  left: string;
  /** Etiqueta de la mitad derecha, p. ej. '13R'. */
  right: string;
  /** Cómo aparece al abrir una escala nueva. Por defecto, de una pieza. */
  default?: SplitMode;
}

export interface HoldDefinition {
  id: string;
  label: string;
  /** Si está, la posición se puede partir en dos desde la propia escala. */
  split?: SplitSpec;
}

export interface PairedHoldDefinition {
  left: HoldDefinition;
  right: HoldDefinition;
}

export type HoldEntry = HoldDefinition | PairedHoldDefinition;

export const isPairedHold = (h: HoldEntry): h is PairedHoldDefinition =>
  'left' in h && 'right' in h;

export type SplitMode = 'P' | 'LR';

/** Campo donde se guarda si la posición va en palé o partida. */
export const splitModeFieldId = (holdId: string): string => `${holdId}-modo`;

/** Lee el modo guardado de una posición divisible; si no hay nada, el suyo por defecto. */
export const readSplitMode = (
  hold: HoldDefinition,
  getValue: (id: string) => string,
): SplitMode => {
  if (!hold.split) return 'P';
  const guardado = getValue(splitModeFieldId(hold.id));
  if (guardado === 'P' || guardado === 'LR') return guardado;
  return hold.split.default ?? 'P';
};

/**
 * Las posiciones que de verdad hay que pintar, sumar o imprimir.
 *
 * Una posición normal se devuelve tal cual. Una divisible devuelve una sola
 * entrada en modo palé y dos en modo partido, cada una con su propio id, que
 * es el prefijo de sus campos `-type`, `-num` y `-content`.
 */
export const activeSubHolds = (
  hold: HoldDefinition,
  getValue: (id: string) => string,
): HoldDefinition[] => {
  if (!hold.split) return [hold];
  if (readSplitMode(hold, getValue) === 'P') {
    return [{ id: `${hold.id}-p`, label: hold.split.p }];
  }
  return [
    { id: `${hold.id}-l`, label: hold.split.left },
    { id: `${hold.id}-r`, label: hold.split.right },
  ];
};

export interface CompartmentDefinition {
  id: string;
  airline: AirlineCode;
  compartmentName: string;
  holds: HoldEntry[];
  expandable?: boolean;
  expandableDefault?: number;
  holdStyle?: 'default' | 'ita';
  bulk?: boolean;
  legend?: string;
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

// ITA Airways A220
export const ITA_A220_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'ita-a220-fwd',
    airline: 'ITA',
    compartmentName: 'COMPARTIMIENTO FWD',
    holds: [
      { id: createHoldId('ITA', 'a220-a'), label: 'Bodega A' },
      { id: createHoldId('ITA', 'a220-b'), label: 'Bodega B' },
    ],
  },
  {
    id: 'ita-a220-aft',
    airline: 'ITA',
    compartmentName: 'COMPARTIMIENTO AFT',
    holds: [
      { id: createHoldId('ITA', 'a220-c'), label: 'Bodega C' },
      { id: createHoldId('ITA', 'a220-f'), label: 'Bodega F' },
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

// ITA A319 — avión contenerizado. Delante 12 y 11 (puerta en 11), detrás
// 42 (puerta) y 41, y el bulk 51 para granel: sin contenedor y sin puerta.
export const ITA_A319_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'ita-a319-comp1',
    airline: 'ITA',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holdStyle: 'ita',
    holds: [
      { id: createHoldId('ITA', 'a319-12'), label: '12' },
      { id: createHoldId('ITA', 'a319-11'), label: '11 🚪' },
    ],
  },
  {
    id: 'ita-a319-comp4',
    airline: 'ITA',
    compartmentName: 'COMPARTIMIENTO 4 AFT',
    holdStyle: 'ita',
    holds: [
      { id: createHoldId('ITA', 'a319-42'), label: '42 🚪' },
      { id: createHoldId('ITA', 'a319-41'), label: '41' },
    ],
  },
  {
    id: 'ita-a319-bulk',
    airline: 'ITA',
    compartmentName: 'Bulk 5 — granel, sin puerta',
    holds: [
      { id: createHoldId('ITA', 'a319-51'), label: '51' },
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

// Wizz Air A321 XLR
export const WIZZ_A321_XLR_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'wizz-a321xlr-comp1',
    airline: 'WIZZ',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('WIZZ', 'a321xlr-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('WIZZ', 'a321xlr-12'), label: 'Bodega 12' },
    ],
  },
  {
    id: 'wizz-a321xlr-comp2',
    airline: 'WIZZ',
    compartmentName: 'COMPARTIMIENTO 2',
    holds: [
      { id: createHoldId('WIZZ', 'a321xlr-21'), label: 'Bodega 21' },
      { id: createHoldId('WIZZ', 'a321xlr-22'), label: 'Bodega 22' },
      { id: createHoldId('WIZZ', 'a321xlr-23'), label: 'Bodega 23' },
    ],
  },
  {
    id: 'wizz-a321xlr-comp3',
    airline: 'WIZZ',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('WIZZ', 'a321xlr-33'), label: 'Bodega 33' },
    ],
  },
  {
    id: 'wizz-a321xlr-comp4',
    airline: 'WIZZ',
    compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('WIZZ', 'a321xlr-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('WIZZ', 'a321xlr-42'), label: 'Bodega 42' },
    ],
  },
  {
    id: 'wizz-a321xlr-bulk5',
    airline: 'WIZZ',
    compartmentName: 'Bulk 5',
    holds: [
      { id: createHoldId('WIZZ', 'a321xlr-51'), label: 'Bodega 51' },
    ],
  },
];

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

// Dan Air A320/A321 — misma distribución en ambos modelos:
// delantero Bodega 1; trasero Bodegas 3, 4 y 5.
export const DAN_AIR_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'dan_air-comp-fwd',
    airline: 'DAN_AIR',
    compartmentName: 'COMPARTIMIENTO DELANTERO FWD',
    holds: [
      { id: createHoldId('DAN_AIR', 'b1'), label: 'Bodega 1 🚪' },
    ],
  },
  {
    id: 'dan_air-comp-aft',
    airline: 'DAN_AIR',
    compartmentName: 'COMPARTIMIENTO TRASERO AFT',
    holds: [
      { id: createHoldId('DAN_AIR', 'b3'), label: 'Bodega 3' },
      { id: createHoldId('DAN_AIR', 'b4'), label: 'Bodega 4 🚪' },
      { id: createHoldId('DAN_AIR', 'b5'), label: 'Bodega 5 🚪' },
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
      { id: createHoldId('TRANSAVIA', 'a321-1'), label: 'Bodega 1' },
    ],
  },
  {
    id: 'transavia-a321-comp2',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 2 FWD',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a321-2'), label: 'Bodega 2' },
    ],
  },
  {
    id: 'transavia-a321-comp3',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a321-3'), label: 'Bodega 3' },
    ],
  },
  {
    id: 'transavia-a321-comp4',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a321-4'), label: 'Bodega 4' },
    ],
  },
  {
    id: 'transavia-a321-comp5',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 5',
    holds: [
      { id: createHoldId('TRANSAVIA', 'a321-5'), label: 'Bodega 5' },
    ],
  },
];

// Transavia 737-800
export const TRANSAVIA_737_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'transavia-737-comp1',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 1',
    holds: [
      { id: createHoldId('TRANSAVIA', '737-1'), label: 'Compartimiento 1' },
    ],
  },
  {
    id: 'transavia-737-comp2',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 2',
    holds: [
      { id: createHoldId('TRANSAVIA', '737-2'), label: 'Compartimiento 2' },
    ],
  },
  {
    id: 'transavia-737-comp3',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 3',
    holds: [
      { id: createHoldId('TRANSAVIA', '737-3'), label: 'Compartimiento 3' },
    ],
  },
  {
    id: 'transavia-737-comp4',
    airline: 'TRANSAVIA',
    compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('TRANSAVIA', '737-4'), label: 'Compartimiento 4' },
    ],
  },
];

// SkyUp B 737-75C
export const SKYUP_B737_75C_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'skyup-b73775c-comp1',
    airline: 'SKYUP',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    legend: 'Loading sequence to CPT: 2 - 3 - 1 - 4.',
    holds: [
      { id: createHoldId('SKYUP', 'b73775c-1'), label: 'Bodega 1' },
    ],
  },
  {
    id: 'skyup-b73775c-comp2',
    airline: 'SKYUP',
    compartmentName: 'COMPARTIMIENTO 2 FWD',
    holds: [
      { id: createHoldId('SKYUP', 'b73775c-2'), label: 'Bodega 2' },
    ],
  },
  {
    id: 'skyup-b73775c-comp3',
    airline: 'SKYUP',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('SKYUP', 'b73775c-3'), label: 'Bodega 3' },
    ],
  },
  {
    id: 'skyup-b73775c-comp4',
    airline: 'SKYUP',
    compartmentName: 'COMPARTIMIENTO 4 AFT',
    holds: [
      { id: createHoldId('SKYUP', 'b73775c-4'), label: 'Bodega 4' },
    ],
  },
];

// WestJet 737-800
export const WESTJET_737_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'westjet-737-fwd',
    airline: 'WESTJET',
    compartmentName: 'COMPARTIMIENTO FWD',
    holds: [
      { id: createHoldId('WESTJET', '737-11'), label: 'Bodega 11' },
      { id: createHoldId('WESTJET', '737-12'), label: 'Bodega 12' },
      { id: createHoldId('WESTJET', '737-21'), label: 'Bodega 21' },
    ],
  },
  {
    id: 'westjet-737-aft',
    airline: 'WESTJET',
    compartmentName: 'COMPARTIMIENTO AFT',
    holds: [
      { id: createHoldId('WESTJET', '737-31'), label: 'Bodega 31' },
      { id: createHoldId('WESTJET', '737-41'), label: 'Bodega 41' },
      { id: createHoldId('WESTJET', '737-42'), label: 'Bodega 42' },
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

// A Jet Boeing 737-800 y 737-800 MAX — misma distribución de bodegas, así que
// comparten definición: al cambiar el modelo en la escala no se pierde lo ya
// anotado. La anterior estaba copiada de la familia A320 y no correspondía:
// 11/12/13, 31/32, 41/42 no existen en el 737.
export const A_JET_737_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'ajet-737-fwd', airline: 'A_JET', compartmentName: 'COMPARTIMIENTO DELANTERO FWD',
    holds: [
      { id: createHoldId('A_JET', '737-c1'), label: 'Compartimiento 1 🚪' },
      { id: createHoldId('A_JET', '737-c1b'), label: 'Compartimiento 1B' },
      { id: createHoldId('A_JET', '737-c2'), label: 'Compartimiento 2' },
    ],
  },
  {
    id: 'ajet-737-aft', airline: 'A_JET', compartmentName: 'COMPARTIMIENTO TRASERO AFT',
    holds: [
      { id: createHoldId('A_JET', '737-c3'), label: 'Compartimiento 3' },
      { id: createHoldId('A_JET', '737-c4'), label: 'Compartimiento 4 🚪' },
      { id: createHoldId('A_JET', '737-c4b'), label: 'Compartimiento 4B · flight kit' },
    ],
  },
];

/** El MAX comparte bodegas con el 737-800 (ver arriba). */
export const A_JET_737_MAX_COMPARTMENTS = A_JET_737_COMPARTMENTS;

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
// TAP Air Portugal A319 — paletizado con contenedores AKE, como el A320.
// El A319 no tiene compartimiento 3: lleva la bodega 1 delante, la 4 detrás y
// el bulk 5 al final.
export const TAP_A319_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'tap-a319-comp1', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 1 FWD', holdStyle: 'ita',
    holds: [
      { id: createHoldId('TAP', 'a319-11'), label: '11 🚪' },
      { id: createHoldId('TAP', 'a319-12'), label: '12' },
    ],
  },
  {
    id: 'tap-a319-comp4', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 4', holdStyle: 'ita',
    holds: [
      { id: createHoldId('TAP', 'a319-41'), label: '41' },
      { id: createHoldId('TAP', 'a319-42'), label: '42 🚪' },
    ],
  },
  {
    id: 'tap-a319-comp5', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 5 — Bulk',
    holds: [
      { id: createHoldId('TAP', 'a319-51'), label: '51' },
      { id: createHoldId('TAP', 'a319-52'), label: '52 🚪' },
    ],
  },
];

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

// Sin Marca A321 XLR — el depósito trasero adicional deja el compartimiento 3
// reducido a la bodega 33, igual que en la ficha del XLR de Wizz Air.
export const SIN_MARCA_A321_XLR_COMPARTMENTS: CompartmentDefinition[] = [
  { id: 'sinmarca-a321xlr-comp1', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 1 FWD',
    holds: [
      { id: createHoldId('SIN_MARCA', 'a321xlr-11'), label: 'Bodega 11 🚪' },
      { id: createHoldId('SIN_MARCA', 'a321xlr-12'), label: 'Bodega 12' },
    ],
  },
  { id: 'sinmarca-a321xlr-comp2', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 2',
    holds: [
      { id: createHoldId('SIN_MARCA', 'a321xlr-21'), label: 'Bodega 21' },
      { id: createHoldId('SIN_MARCA', 'a321xlr-22'), label: 'Bodega 22' },
      { id: createHoldId('SIN_MARCA', 'a321xlr-23'), label: 'Bodega 23' },
    ],
  },
  { id: 'sinmarca-a321xlr-comp3', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 3 AFT',
    holds: [
      { id: createHoldId('SIN_MARCA', 'a321xlr-33'), label: 'Bodega 33' },
    ],
  },
  { id: 'sinmarca-a321xlr-comp4', airline: 'SIN_MARCA', compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('SIN_MARCA', 'a321xlr-41'), label: 'Bodega 41 🚪' },
      { id: createHoldId('SIN_MARCA', 'a321xlr-42'), label: 'Bodega 42' },
    ],
  },
  { id: 'sinmarca-a321xlr-bulk5', airline: 'SIN_MARCA', compartmentName: 'Bulk 5',
    holds: [
      { id: createHoldId('SIN_MARCA', 'a321xlr-51'), label: 'Bodega 51' },
    ],
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
    id: 'croatia-a220-comp-fwd', airline: 'CROATIA', compartmentName: 'COMPARTIMIENTO FWD',
    holds: [
      { id: createHoldId('CROATIA', 'a220-11'), label: 'Bodega 11' },
      { id: createHoldId('CROATIA', 'a220-12'), label: 'Bodega 12' },
    ],
  },
  {
    id: 'croatia-a220-comp-aft', airline: 'CROATIA', compartmentName: 'COMPARTIMIENTO AFT',
    holds: [
      { id: createHoldId('CROATIA', 'a220-41'), label: 'Bodega 41' },
      { id: createHoldId('CROATIA', 'a220-42'), label: 'Bodega 42' },
      { id: createHoldId('CROATIA', 'a220-43'), label: 'Bodega 43' },
    ],
  },
];

// Eurowings A319
export const EUROWINGS_A319_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'eurowings-a319-comp-fwd', airline: 'EUROWINGS', compartmentName: 'COMPARTIMIENTO DELANTERO',
    holds: [{ id: createHoldId('EUROWINGS', 'a319-1'), label: 'Bodega 1' }],
  },
  {
    id: 'eurowings-a319-comp-aft', airline: 'EUROWINGS', compartmentName: 'COMPARTIMIENTO TRASERO',
    holds: [
      { id: createHoldId('EUROWINGS', 'a319-4'), label: 'Bodega 4' },
      { id: createHoldId('EUROWINGS', 'a319-5'), label: 'Bodega 5' },
    ],
  },
];

// Eurowings A320
export const EUROWINGS_A320_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'eurowings-a320-comp1', airline: 'EUROWINGS', compartmentName: 'COMPARTIMIENTO 1',
    holds: [{ id: createHoldId('EUROWINGS', 'a320-1'), label: 'Bodega 1' }],
  },
  {
    id: 'eurowings-a320-comp3', airline: 'EUROWINGS', compartmentName: 'COMPARTIMIENTO 3',
    holds: [{ id: createHoldId('EUROWINGS', 'a320-3'), label: 'Bodega 3' }],
  },
  {
    id: 'eurowings-a320-comp4', airline: 'EUROWINGS', compartmentName: 'COMPARTIMIENTO 4',
    holds: [{ id: createHoldId('EUROWINGS', 'a320-4'), label: 'Bodega 4' }],
  },
  {
    id: 'eurowings-a320-comp5', airline: 'EUROWINGS', compartmentName: 'COMPARTIMIENTO 5',
    holds: [{ id: createHoldId('EUROWINGS', 'a320-5'), label: 'Bodega 5' }],
  },
];

// TAP 321 Granel
export const TAP_321_GRANEL_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'tap-321g-comp1', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 1',
    holds: [
      { id: createHoldId('TAP', '321g-11'), label: 'Bodega 11' },
      { id: createHoldId('TAP', '321g-12'), label: 'Bodega 12' },
    ],
  },
  {
    id: 'tap-321g-comp2', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 2',
    holds: [
      { id: createHoldId('TAP', '321g-21'), label: 'Bodega 21' },
      { id: createHoldId('TAP', '321g-22'), label: 'Bodega 22' },
    ],
  },
  {
    id: 'tap-321g-comp3', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 3',
    holds: [
      { id: createHoldId('TAP', '321g-31'), label: 'Bodega 31' },
    ],
  },
  {
    id: 'tap-321g-comp4', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 4',
    holds: [
      { id: createHoldId('TAP', '321g-41'), label: 'Bodega 41' },
      { id: createHoldId('TAP', '321g-42'), label: 'Bodega 42' },
    ],
  },
  {
    id: 'tap-321g-comp5', airline: 'TAP', compartmentName: 'COMPARTIMIENTO 5',
    holds: [
      { id: createHoldId('TAP', '321g-51'), label: 'Bodega 51' },
      { id: createHoldId('TAP', '321g-52'), label: 'Bodega 52' },
      { id: createHoldId('TAP', '321g-53'), label: 'Bodega 53' },
    ],
  },
];

/*
 * Azul B787-8 (hoja de carga B787-8UX).
 *
 * Delante los compartimientos 1 y 2, detrás el 3 y el 4, y el 5 es el granel
 * de cola. Todas las posiciones son divisibles: pueden llevar un palé
 * (PAG/PLA/PMC) o partirse en dos para meter dos AKE. El modo que se ve al
 * abrir la escala es el que trae impreso la hoja, pero se cambia con un toque.
 *
 * Puertas: la de delante cae en la 13R y la de atrás en la 41R.
 */
export const AZUL_B787_8_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'azul-b7878-comp1',
    airline: 'AZUL',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holdStyle: 'ita',
    legend: 'MAX 15309 kg',
    holds: [
      {
        id: createHoldId('AZUL', 'b7878-11'),
        label: '11',
        split: { p: '11P', left: '11L', right: '11R', default: 'LR' },
      },
      {
        id: createHoldId('AZUL', 'b7878-12'),
        label: '12',
        split: { p: '12P', left: '12L', right: '12R', default: 'P' },
      },
      /*
       * La 13 va doble: la hoja la imprime en dos bloques separados, y en la
       * del 03NOV26 se cargaron los dos (13L/13R con BY+BT, y 13P con un
       * PAG). La puerta se marca en la primera, que es la que lleva anotado
       * «Puerta» a mano en la hoja.
       */
      {
        id: createHoldId('AZUL', 'b7878-13'),
        label: '13',
        split: { p: '13P 🚪', left: '13L', right: '13R 🚪', default: 'LR' },
      },
      {
        id: createHoldId('AZUL', 'b7878-13b'),
        label: '13',
        split: { p: '13P', left: '13L', right: '13R', default: 'P' },
      },
    ],
  },
  {
    id: 'azul-b7878-comp2',
    airline: 'AZUL',
    compartmentName: 'COMPARTIMIENTO 2 FWD',
    holdStyle: 'ita',
    legend: 'MAX 12701 kg',
    holds: [
      {
        id: createHoldId('AZUL', 'b7878-21'),
        label: '21',
        split: { p: '21P', left: '21L', right: '21R', default: 'P' },
      },
      {
        id: createHoldId('AZUL', 'b7878-22'),
        label: '22',
        split: { p: '22P', left: '22L', right: '22R', default: 'P' },
      },
    ],
  },
  {
    id: 'azul-b7878-comp3',
    airline: 'AZUL',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holdStyle: 'ita',
    legend: 'MAX 12678 kg',
    holds: [
      {
        id: createHoldId('AZUL', 'b7878-31'),
        label: '31',
        split: { p: '31P', left: '31L', right: '31R', default: 'P' },
      },
      {
        id: createHoldId('AZUL', 'b7878-32'),
        label: '32',
        split: { p: '32P', left: '32L', right: '32R', default: 'P' },
      },
    ],
  },
  {
    id: 'azul-b7878-comp4',
    airline: 'AZUL',
    compartmentName: 'COMPARTIMIENTO 4 AFT',
    holdStyle: 'ita',
    legend: 'MAX 09525 kg',
    holds: [
      {
        id: createHoldId('AZUL', 'b7878-41'),
        label: '41',
        split: { p: '41P 🚪', left: '41L', right: '41R 🚪', default: 'LR' },
      },
      {
        id: createHoldId('AZUL', 'b7878-42'),
        label: '42',
        split: { p: '42P', left: '42L', right: '42R', default: 'LR' },
      },
      {
        id: createHoldId('AZUL', 'b7878-43'),
        label: '43',
        split: { p: '43P', left: '43L', right: '43R', default: 'LR' },
      },
    ],
  },
  {
    id: 'azul-b7878-bulk5',
    airline: 'AZUL',
    compartmentName: 'COMPARTIMIENTO 5 BULK — granel',
    bulk: true,
    legend: 'MAX 02735 kg · DAA, bicis y equipaje suelto',
    expandable: true,
    expandableDefault: 5,
    holds: [
      { id: createHoldId('AZUL', 'b7878-5'), label: 'Bulk 5' },
    ],
  },
];

/*
 * Azul B767-3 (hoja de carga AD8001 / CSTSU).
 *
 * Delante los compartimientos 1 y 2, detrás el 3 y el 4, y el 5 de granel.
 * En este avión se carga por el lado izquierdo, así que las posiciones vienen
 * de una pieza; la 12 es la que la hoja imprime partible y sale dos veces,
 * una como 12L/12R y otra como 12P. Aun así todas llevan el interruptor:
 * cuesta lo mismo y evita quedarse corto el día que la carga cambie.
 *
 * Puertas: la de delante en la 12 y la de atrás en la 41.
 *
 * La cubierta principal (CPT 0) no se monta: en este avión va pasaje y la
 * hoja la imprime siempre vacía.
 */
const partible = (
  id: string,
  label: string,
  etiquetas: { p: string; left: string; right: string },
  porDefecto: SplitMode = 'P',
): HoldDefinition => ({
  id: createHoldId('AZUL', id),
  label,
  split: { ...etiquetas, default: porDefecto },
});

export const AZUL_B767_COMPARTMENTS: CompartmentDefinition[] = [
  {
    id: 'azul-b767-comp1',
    airline: 'AZUL',
    compartmentName: 'COMPARTIMIENTO 1 FWD',
    holdStyle: 'ita',
    legend: 'MAX 10205 kg',
    holds: [
      partible('b767-11', '11', { p: '11', left: '11L', right: '11R' }),
      // La 12 va doble, como la imprime la hoja: una vez partida y otra en
      // palé. La puerta de delante cae aquí.
      partible('b767-12', '12', { p: '12P 🚪', left: '12L', right: '12R 🚪' }, 'LR'),
      partible('b767-12b', '12', { p: '12P', left: '12L', right: '12R' }),
    ],
  },
  {
    id: 'azul-b767-comp2',
    airline: 'AZUL',
    compartmentName: 'COMPARTIMIENTO 2 FWD',
    holdStyle: 'ita',
    legend: 'MAX 10205 kg',
    holds: [
      partible('b767-21', '21', { p: '21P', left: '21L', right: '21R' }),
      partible('b767-22', '22', { p: '22P', left: '22L', right: '22R' }),
    ],
  },
  {
    id: 'azul-b767-comp3',
    airline: 'AZUL',
    compartmentName: 'COMPARTIMIENTO 3 AFT',
    holdStyle: 'ita',
    legend: 'MAX 9796 kg',
    holds: [
      partible('b767-31', '31', { p: '31', left: '31L', right: '31R' }),
      partible('b767-32', '32', { p: '32', left: '32L', right: '32R' }),
      partible('b767-33', '33', { p: '33', left: '33L', right: '33R' }),
      partible('b767-34', '34', { p: '34', left: '34L', right: '34R' }),
    ],
  },
  {
    id: 'azul-b767-comp4',
    airline: 'AZUL',
    compartmentName: 'COMPARTIMIENTO 4 AFT',
    holdStyle: 'ita',
    legend: 'MAX 7347 kg',
    holds: [
      partible('b767-41', '41', { p: '41 🚪', left: '41L 🚪', right: '41R' }),
      partible('b767-42', '42', { p: '42', left: '42L', right: '42R' }),
      partible('b767-43', '43', { p: '43', left: '43L', right: '43R' }),
    ],
  },
  {
    id: 'azul-b767-bulk5',
    airline: 'AZUL',
    compartmentName: 'COMPARTIMIENTO 5 BULK — granel',
    bulk: true,
    legend: 'MAX 2925 kg · DAA, bicis y equipaje suelto',
    expandable: true,
    expandableDefault: 5,
    holds: [
      { id: createHoldId('AZUL', 'b767-5'), label: 'Bulk 5' },
    ],
  },
];

export const ITA_STYLE_TYPE_OPTIONS: Record<string, string[]> = {
  ITA: ['AKH-AZ', 'AKH-LH', 'PKC-AZ'],
  TAP: ['AKH-TP', 'PKC-TP'],
  AZUL: ['AKE', 'AKN', 'PAG', 'PLA', 'PMC'],
};

/*
 * Terminación del número de contenedor, la que va detrás de la numeración.
 *
 * En la LIR de Azul los AKE terminan en AD («AKE31063AD») y los palés en R7
 * o en R9 («PMC36713R9», «PAG58322R7»). Se elige de una lista en vez de
 * teclearla: son dos letras que se repiten en cada posición y a mano se
 * equivoca uno. Si la compañía aprueba otra terminación, se añade aquí.
 */
export const ULD_SUFFIX_OPTIONS: Record<string, Record<string, string[]>> = {
  AZUL: {
    AKE: ['AD'],
    AKN: ['AD'],
    PAG: ['R7', 'R9'],
    PLA: ['R7', 'R9'],
    PMC: ['R7', 'R9'],
  },
};

/** Terminaciones posibles para el tipo elegido; vacío si ese tipo no lleva. */
export const sufijosDeUld = (airline: string | undefined, tipo: string): string[] => {
  if (!airline || !tipo || tipo === 'NIL') return [];
  return ULD_SUFFIX_OPTIONS[airline]?.[tipo] ?? [];
};

/**
 * ¿Hay que borrar la terminación al cambiar de tipo de contenedor?
 *
 * Un AKE no termina en R9. Si se deja la de antes, el número de contenedor
 * que queda apuntado no existe, y eso en una LIR es un error que se arrastra
 * hasta el avión. Devuelve true cuando la que había ya no vale.
 */
export const sufijoYaNoVale = (
  airline: string | undefined,
  tipoNuevo: string,
  sufijoActual: string,
): boolean => {
  if (!sufijoActual) return false;
  return !sufijosDeUld(airline, tipoNuevo).includes(sufijoActual);
};

const getCompartmentsByAirlineRaw = (airline: AirlineCode, aircraftModel?: string): CompartmentDefinition[] => {
  if (airline === 'SKYEXPRESS') return SKYEXPRESS_COMPARTMENTS;
  if (airline === 'TAP') {
    if (aircraftModel === 'EMB90') return TAP_EMB90_COMPARTMENTS;
    if (aircraftModel === 'EMB95') return TAP_EMB95_COMPARTMENTS;
    if (aircraftModel === 'A321') return TAP_A321_COMPARTMENTS;
    if (aircraftModel === 'A320') return TAP_A320_COMPARTMENTS;
    if (aircraftModel === 'A319') return TAP_A319_COMPARTMENTS;
    if (aircraftModel === '321_GRANEL') return TAP_321_GRANEL_COMPARTMENTS;
    return [];
  }
  if (airline === 'ITA') {
    if (aircraftModel === 'A321') return ITA_A321_COMPARTMENTS;
    if (aircraftModel === 'A320') return ITA_A320_COMPARTMENTS;
    if (aircraftModel === 'A319') return ITA_A319_COMPARTMENTS;
    if (aircraftModel === 'A220') return ITA_A220_COMPARTMENTS;
    return [];
  }
  if (airline === 'WIZZ') {
    if (aircraftModel === 'A321') return WIZZ_A321_COMPARTMENTS;
    if (aircraftModel === 'A321_XLR') return WIZZ_A321_XLR_COMPARTMENTS;
    if (aircraftModel === 'A320') return WIZZ_A320_COMPARTMENTS;
    return [];
  }
  if (airline === 'DAN_AIR') {
    if (aircraftModel === 'A320' || aircraftModel === 'A321') return DAN_AIR_COMPARTMENTS;
    return [];
  }
  if (airline === 'AIR_CANADA' || airline === 'AIR_CANADA_CARGO') {
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
  if (airline === 'SKYUP') {
    if (aircraftModel === 'B737-75C') return SKYUP_B737_75C_COMPARTMENTS;
    return [];
  }
  if (airline === 'A_JET') {
    if (aircraftModel === 'A320') return A_JET_A320_COMPARTMENTS;
    if (aircraftModel === 'A321') return A_JET_A321_COMPARTMENTS;
    if (aircraftModel === '737-800') return A_JET_737_COMPARTMENTS;
    if (aircraftModel === '737_MAX') return A_JET_737_MAX_COMPARTMENTS;
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
    if (aircraftModel === 'A321_XLR') return SIN_MARCA_A321_XLR_COMPARTMENTS;
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
    if (aircraftModel === 'A319') return EUROWINGS_A319_COMPARTMENTS;
    if (aircraftModel === 'A321') return WIZZ_A321_COMPARTMENTS.map(c => ({ ...c, id: c.id.replace('wizz', 'eurowings'), airline: 'EUROWINGS' as AirlineCode }));
    if (aircraftModel === 'A320') return EUROWINGS_A320_COMPARTMENTS;
    return [];
  }
  if (airline === 'PEGASUS') {
    if (aircraftModel === 'A321') return PEGASUS_A321_COMPARTMENTS;
    return SKYEXPRESS_COMPARTMENTS;
  }
  if (airline === 'AZUL') {
    if (aircraftModel === 'B787-8') return AZUL_B787_8_COMPARTMENTS;
    if (aircraftModel === 'B767') return AZUL_B767_COMPARTMENTS;
    // El B767 y el A339 siguen con el reparto genérico que ya tenían: tocarlo
    // aquí borraría de la vista lo escrito en las escalas ya trabajadas.
    return SKYEXPRESS_COMPARTMENTS;
  }
  if (airline === 'WESTJET') {
    if (aircraftModel === '737-800') return WESTJET_737_COMPARTMENTS;
    return [];
  }
  // Demo: usar compartimientos de Sky Express para las demás aerolíneas
  return SKYEXPRESS_COMPARTMENTS;
};

// Public wrapper: applies admin-managed overrides (catalog store) on top of hardcoded data.
// Overrides match by compartment id / hold id. New compartments/holds added in catalog are appended.
export const getCompartmentsByAirline = (airline: AirlineCode, aircraftModel?: string): CompartmentDefinition[] => {
  const base = getCompartmentsByAirlineRaw(airline, aircraftModel);
  const { compartments: compOvs, holds: holdOvs } = getCatalogSnapshot();

  // 1) Map overrides onto existing compartments + holds
  const overrideById = new Map(compOvs.map(c => [c.id, c]));
  const holdOverrideById = new Map(holdOvs.map(h => [h.id, h]));

  const mapped: CompartmentDefinition[] = base.map(c => {
    const ov = overrideById.get(c.id);
    const compName = ov?.name ?? c.compartmentName;

    const newHolds: HoldEntry[] = c.holds.map(h => {
      if (isPairedHold(h)) {
        const lOv = holdOverrideById.get(h.left.id);
        const rOv = holdOverrideById.get(h.right.id);
        if (lOv && !lOv.active && rOv && !rOv.active) return null as any;
        return {
          left: { ...h.left, label: lOv?.label ?? h.left.label },
          right: { ...h.right, label: rOv?.label ?? h.right.label },
        };
      }
      const hOv = holdOverrideById.get(h.id);
      if (hOv && !hOv.active) return null as any;
      return { ...h, label: hOv?.label ?? h.label };
    }).filter(Boolean) as HoldEntry[];

    return {
      ...c,
      compartmentName: compName,
      holds: newHolds,
    };
  }).filter(c => {
    const ov = overrideById.get(c.id);
    return ov ? ov.active : true;
  });

  // 2) Append new compartments added by admin for this airline+model
  const extras = compOvs
    .filter(c => c.airlineCode === airline
      && c.active
      && !base.some(b => b.id === c.id)
      && (c.aircraftModelCode === (aircraftModel ?? null) || c.aircraftModelCode === aircraftModel))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map<CompartmentDefinition>(c => {
      const compartmentHolds = holdOvs
        .filter(h => h.compartmentId === c.id && h.active)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      // Group by pair_group; singletons stand alone
      const grouped: HoldEntry[] = [];
      const pairBuf = new Map<string, { left?: HoldOverride; right?: HoldOverride }>();
      compartmentHolds.forEach(h => {
        if (h.pairGroup) {
          const slot = pairBuf.get(h.pairGroup) || {};
          if (h.pairSide === 'left') slot.left = h; else if (h.pairSide === 'right') slot.right = h;
          pairBuf.set(h.pairGroup, slot);
        } else {
          grouped.push({ id: h.id, label: h.label });
        }
      });
      pairBuf.forEach(slot => {
        if (slot.left && slot.right) {
          grouped.push({
            left: { id: slot.left.id, label: slot.left.label },
            right: { id: slot.right.id, label: slot.right.label },
          });
        } else if (slot.left) {
          grouped.push({ id: slot.left.id, label: slot.left.label });
        } else if (slot.right) {
          grouped.push({ id: slot.right.id, label: slot.right.label });
        }
      });

      return {
        id: c.id,
        airline,
        compartmentName: c.name,
        holdStyle: c.holdStyle,
        bulk: c.bulk,
        expandable: c.expandable,
        expandableDefault: c.expandableDefault ?? undefined,
        holds: grouped,
      };
    });

  return [...mapped, ...extras];
};




/*
 * Nombre legible de un campo de bodega a partir de su id.
 *
 * Los ids son internos ('azul-hold-b787813b-p-content'). En el recuperador de
 * datos hay que enseñar QUÉ se va a restaurar antes de tocar nada, y una
 * lista de ids no dice nada: si no se entiende lo que hay dentro de la copia,
 * no se puede decidir si restaurarla.
 *
 * Se construye del catálogo fijo, no del de administración: es sólo para
 * poner nombres y así no depende de que el catálogo esté cargado.
 */
const SUFIJOS: Array<[string, string]> = [
  ['-type', 'tipo'],
  ['-num', 'nº'],
  ['-suf', 'terminación'],
  ['-content', ''],
  ['-modo', 'reparto'],
];

let nombresCache: Map<string, string> | null = null;

const construirNombres = (): Map<string, string> => {
  const mapa = new Map<string, string>();
  const anota = (id: string, label: string) => {
    if (!mapa.has(id)) mapa.set(id, label);
  };
  const vistos = new Set<string>();
  const recorrer = (comps: CompartmentDefinition[]) => {
    comps.forEach((c) => {
      if (vistos.has(c.id)) return;
      vistos.add(c.id);
      c.holds.forEach((h) => {
        if (isPairedHold(h)) {
          anota(h.left.id, h.left.label);
          anota(h.right.id, h.right.label);
          return;
        }
        anota(h.id, h.label);
        if (h.split) {
          anota(`${h.id}-p`, h.split.p);
          anota(`${h.id}-l`, h.split.left);
          anota(`${h.id}-r`, h.split.right);
        }
      });
    });
  };
  Object.entries(AIRCRAFT_MODELS).forEach(([airline, modelos]) => {
    recorrer(getCompartmentsByAirlineRaw(airline as AirlineCode));
    modelos.forEach((m) => recorrer(getCompartmentsByAirlineRaw(airline as AirlineCode, m.model)));
  });
  return mapa;
};

/**
 * 'azul-hold-b787813b-p-content' → 'Bodega 13P'.
 * Devuelve null si el id no es de una bodega conocida.
 */
const conBodega = (label: string): string => {
  const limpio = label.trim();
  // Algunas aerolíneas ya rotulan la posición como «Bodega 2»; otras sólo
  // ponen el número («13L»). No se repite la palabra.
  return /^bodega\b/i.test(limpio) ? limpio : `Bodega ${limpio}`;
};

export const nombreDeCampoDeBodega = (fieldId: string): string | null => {
  if (!fieldId) return null;
  if (!nombresCache) nombresCache = construirNombres();
  const directo = nombresCache.get(fieldId);
  if (directo) return conBodega(directo);
  for (const [sufijo, detalle] of SUFIJOS) {
    if (!fieldId.endsWith(sufijo)) continue;
    const base = fieldId.slice(0, -sufijo.length);
    const label = nombresCache.get(base);
    if (!label) continue;
    return detalle ? `${conBodega(label)} · ${detalle}` : conBodega(label);
  }
  return null;
};
