import { FieldDefinition, AirlineCode } from '@/types/turnaround';
import { v4 as uuidv4 } from 'uuid';

// Helper to create field definitions
const createField = (
  airline: AirlineCode,
  code: string,
  label: string,
  sortOrder: number
): FieldDefinition => ({
  id: uuidv4(),
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
  createField('TAP', 'B-Xr', 'Restos', 9),
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
  createField('WIZZ', 'DAA', 'Delivery At Aircraft (Carrito)', 5),
  createField('WIZZ', 'D', 'Crew', 6),
  createField('WIZZ', 'E', 'Equipment', 7),
  createField('WIZZ', 'BH', 'Grupo (varios de tránsito mismo destino)', 8),
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
  createField('AEGEAN', 'DAA', 'Delivery At Aircraft (Carrito)', 7),
  createField('AEGEAN', 'CREW', 'Crew', 8),
  createField('AEGEAN', 'E', 'Equipment', 9),
  createField('AEGEAN', 'BH', 'Grupo (varios de tránsito mismo destino)', 10),
  createField('AEGEAN', 'B-Xr', 'Restos', 11),
  createField('AEGEAN', 'WLB', 'Wheelchair – Lithium Battery (Manual Power)', 12),
  createField('AEGEAN', 'WCH', 'Wheelchair', 13),
  createField('AEGEAN', 'WDB', 'Wheelchair – Dry Battery', 14),
];

// All field definitions combined
export const ALL_FIELD_DEFINITIONS: FieldDefinition[] = [
  ...TAP_FIELDS,
  ...WIZZ_FIELDS,
  ...ITA_FIELDS,
  ...AEGEAN_FIELDS,
];

// Get fields by airline
export const getFieldsByAirline = (airline: AirlineCode): FieldDefinition[] => {
  return ALL_FIELD_DEFINITIONS
    .filter(f => f.airline === airline && f.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
};
