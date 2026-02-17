import { FieldDefinition, AirlineCode } from '@/types/turnaround';

// Helper to create deterministic field ID based on airline + code
const createFieldId = (airline: AirlineCode, code: string): string => {
  return `${airline.toLowerCase()}-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
};

// Helper to create field definitions with stable IDs
const createField = (
  airline: AirlineCode,
  code: string,
  label: string,
  sortOrder: number
): FieldDefinition => ({
  id: createFieldId(airline, code),
  airline,
  code,
  label,
  inputType: 'alphanumeric',
  sortOrder,
  active: true,
});

// TAP Air Portugal - Salida
export const TAP_FIELDS: FieldDefinition[] = [
  createField('TAP', 'BT', 'Tránsito', 1),
  createField('TAP', 'BY', 'Local', 2),
  createField('TAP', 'BW', 'Gate / Mano / Puerta', 3),
  createField('TAP', 'BS', 'Short', 4),
  createField('TAP', 'BP', 'Priority', 5),
  createField('TAP', 'BG', 'Super Short', 6),
  createField('TAP', 'D', 'Crew', 7),
  createField('TAP', 'E', 'Equipment', 8),
  createField('TAP', 'BE', 'Tránsito internacional', 9),
  createField('TAP', 'DAA', 'Delivery At Aircraft (Carrito)', 10),
  createField('TAP', 'Crew', 'Tripulación', 11),
  createField('TAP', 'BH', 'Grupo (varios de tránsito mismo destino)', 12),
  createField('TAP', 'WLB', 'Wheelchair – Lithium Battery (Manual Power)', 13),
  createField('TAP', 'WMP', 'Wheelchair', 14),
  createField('TAP', 'WDB', 'Wheelchair – Dry Battery', 15),
];

// WizzAir - Salida
export const WIZZ_FIELDS: FieldDefinition[] = [
  createField('WIZZ', 'BT', 'Tránsito', 1),
  createField('WIZZ', 'BY', 'Local', 2),
  createField('WIZZ', 'BG', 'Gate / Mano / Puerta', 3),
  createField('WIZZ', 'BP', 'Priority', 4),
  createField('WIZZ', 'DAA', 'Delivery at Aircraft (Carrito)', 5),
  createField('WIZZ', 'D', 'Crew', 6),
  createField('WIZZ', 'E', 'Equipment', 7),
  createField('WIZZ', 'BH', 'Grupo (Varios tránsitos mismo destino)', 8),
  createField('WIZZ', 'WLB', 'Wheelchair – Lithium Battery (Manual Power)', 9),
  createField('WIZZ', 'WCH', 'Wheelchair', 10),
  createField('WIZZ', 'WDB', 'Wheelchair – Dry Battery', 11),
];

// ITA Airways - Salida
export const ITA_FIELDS: FieldDefinition[] = [
  createField('ITA', 'BT', 'Tránsito', 1),
  createField('ITA', 'BY', 'Local', 2),
  createField('ITA', 'BG', 'Gate / Mano / Puerta', 3),
  createField('ITA', 'BJ', 'Priority', 4),
  createField('ITA', 'BR', 'Rush', 5),
  createField('ITA', 'DAA', 'Delivery At Aircraft (Carrito)', 6),
  createField('ITA', 'CREW', 'Crew', 7),
  createField('ITA', 'E', 'Equipment', 8),
  createField('ITA', 'BH', 'Grupo (varios de tránsito mismo destino)', 9),
  createField('ITA', 'B-Xr', 'Restos', 10),
  createField('ITA', 'WLB', 'Wheelchair – Lithium Battery (Manual Power)', 11),
  createField('ITA', 'WCH', 'Wheelchair', 12),
  createField('ITA', 'WDB', 'Wheelchair – Dry Battery', 13),
];

// Aegean Airlines - Salida
export const AEGEAN_FIELDS: FieldDefinition[] = [
  createField('AEGEAN', 'BT', 'Tránsito', 1),
  createField('AEGEAN', 'BB', 'Local', 2),
  createField('AEGEAN', 'BS', 'Short', 3),
  createField('AEGEAN', 'BG', 'Gate / Mano / Puerta', 4),
  createField('AEGEAN', 'BF', 'Priority', 5),
  createField('AEGEAN', 'BR', 'Rush', 6),
  createField('AEGEAN', 'DAA', 'Delivery at Aircraft (Carrito)', 7),
  createField('AEGEAN', 'CREW', 'Crew', 8),
  createField('AEGEAN', 'E', 'Equipment', 9),
  createField('AEGEAN', 'BH', 'Grupo (varios tránsitos mismo destino)', 10),
  createField('AEGEAN', 'WLB', 'Wheelchair – Lithium Battery (Manual Power)', 11),
  createField('AEGEAN', 'WCH', 'Wheelchair', 12),
  createField('AEGEAN', 'WDB', 'Wheelchair – Dry Battery', 13),
];

// Shared fields for Pegasus, Transavia, Sky Express
const createSharedFields = (airline: AirlineCode): FieldDefinition[] => [
  createField(airline, 'BT', 'Tránsito', 1),
  createField(airline, 'BY', 'Local', 2),
  createField(airline, 'BG', 'Gate – Mano – Puerta', 3),
  createField(airline, 'BP', 'Priority', 4),
  createField(airline, 'DAA', 'Delivery At Aircraft (Carrito)', 5),
  createField(airline, 'D', 'Crew', 6),
  createField(airline, 'E', 'Equipment', 7),
  createField(airline, 'BH', 'Grupo (varios de tránsito mismo destino)', 8),
  createField(airline, 'WLB', 'Wheelchair – Lithium Battery (Manual Power)', 9),
  createField(airline, 'WCH', 'Wheelchair', 10),
  createField(airline, 'WDB', 'Wheelchair – Dry Battery', 11),
];

export const A_JET_FIELDS: FieldDefinition[] = createSharedFields('A_JET');
export const PEGASUS_FIELDS: FieldDefinition[] = createSharedFields('PEGASUS');
export const TRANSAVIA_FIELDS: FieldDefinition[] = createSharedFields('TRANSAVIA');
export const SKYEXPRESS_FIELDS: FieldDefinition[] = [
  createField('SKYEXPRESS', 'BT', 'Tránsito', 1),
  createField('SKYEXPRESS', 'BY', 'Local', 2),
  createField('SKYEXPRESS', 'BW', 'Gate – Equipaje de Mano', 3),
  createField('SKYEXPRESS', 'BS', 'Short', 4),
  createField('SKYEXPRESS', 'BC', 'Priority', 5),
  createField('SKYEXPRESS', 'D', 'Crew', 6),
  createField('SKYEXPRESS', 'E', 'Equipment', 7),
];
export const AIR_CANADA_FIELDS: FieldDefinition[] = [
  createField('AIR_CANADA', 'BT', 'Tránsito', 1),
  createField('AIR_CANADA', 'BY', 'Local', 2),
  createField('AIR_CANADA', 'BG', 'Gate / Mano / Puerta', 3),
  createField('AIR_CANADA', 'BP', 'Priority', 4),
  createField('AIR_CANADA', 'DAA', 'Delivery at Aircraft (Carrito)', 5),
  createField('AIR_CANADA', 'D', 'Crew', 6),
  createField('AIR_CANADA', 'E', 'Equipment', 7),
  createField('AIR_CANADA', 'BH', 'Grupo (Varios tránsitos mismo destino)', 8),
  createField('AIR_CANADA', 'WLB', 'Wheelchair – Lithium Battery (Manual Power)', 9),
  createField('AIR_CANADA', 'WCH', 'Wheelchair', 10),
  createField('AIR_CANADA', 'WDB', 'Wheelchair – Dry Battery', 11),
];
export const ALBASTAR_FIELDS: FieldDefinition[] = createSharedFields('ALBASTAR');
export const ICELANDAIR_FIELDS: FieldDefinition[] = createSharedFields('ICELANDAIR');
export const AZUL_FIELDS: FieldDefinition[] = createSharedFields('AZUL');
export const AMAZON_FIELDS: FieldDefinition[] = createSharedFields('AMAZON');

// All field definitions combined
export const ALL_FIELD_DEFINITIONS: FieldDefinition[] = [
  ...A_JET_FIELDS,
  ...TAP_FIELDS,
  ...WIZZ_FIELDS,
  ...ITA_FIELDS,
  ...AEGEAN_FIELDS,
  ...PEGASUS_FIELDS,
  ...TRANSAVIA_FIELDS,
  ...SKYEXPRESS_FIELDS,
  ...AIR_CANADA_FIELDS,
  ...ALBASTAR_FIELDS,
  ...ICELANDAIR_FIELDS,
  ...AZUL_FIELDS,
  ...AMAZON_FIELDS,
];

// Get fields by airline
export const getFieldsByAirline = (airline: AirlineCode): FieldDefinition[] => {
  return ALL_FIELD_DEFINITIONS
    .filter(f => f.airline === airline && f.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
};
