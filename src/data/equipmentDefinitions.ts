import { AirlineCode } from '@/types/turnaround';

export interface EquipmentItem {
  id: string;
  label: string;
}

export interface EquipmentCategory {
  id: string;
  label: string;
  emoji: string;
  items: EquipmentItem[];
}

// Small (narrow-body) aircraft models — pushback limited to PQ 8501/8500
const SMALL_AIRCRAFT_MODELS = new Set([
  'A220', 'A319', 'A320', 'A321',
  'B737', '737-800', 'B734',
  'EMB90', 'EMB95',
  'A320_AIRBALTIC',
]);

export const isSmallAircraft = (model: string | null): boolean => {
  if (!model) return true; // default to small if unknown
  return SMALL_AIRCRAFT_MODELS.has(model);
};

const ALL_PUSHBACK_ITEMS: EquipmentItem[] = [
  { id: 'PQ8501', label: 'PQ 8501' },
  { id: 'PQ8500', label: 'PQ 8500' },
  { id: 'GD8703', label: 'GD 8703' },
  { id: 'BARRA8701', label: 'BARRA 8701' },
];

const SMALL_PUSHBACK_ITEMS: EquipmentItem[] = [
  { id: 'PQ8501', label: 'PQ 8501' },
  { id: 'PQ8500', label: 'PQ 8500' },
];

export const getEquipmentCategories = (aircraftModel: string | null): EquipmentCategory[] => {
  const small = isSmallAircraft(aircraftModel);

  return [
    {
      id: 'TRACTORES',
      label: 'Tractor',
      emoji: '🚜',
      items: [
        { id: '8101', label: '8101' },
        { id: '8102', label: '8102' },
        { id: '8103', label: '8103' },
        { id: '8104', label: '8104' },
        { id: '8105', label: '8105' },
        { id: '8106', label: '8106' },
        { id: '8109', label: '8109' },
        { id: '8112', label: '8112' },
        { id: '8113', label: '8113' },
        { id: '8114', label: '8114' },
        { id: '8115', label: '8115' },
        { id: '1226', label: '1226' },
      ],
    },
    {
      id: 'CINTAS',
      label: 'Cinta',
      emoji: '🛤️',
      items: [
        { id: '8301', label: '8301' },
        { id: '8302', label: '8302' },
        { id: '8303', label: '8303' },
        { id: '8304', label: '8304' },
        { id: 'PW8305', label: 'PW 8305' },
        { id: '8306', label: '8306' },
        { id: '8307', label: '8307' },
      ],
    },
    {
      id: 'ESCALERAS',
      label: 'Escalera',
      emoji: '🪜',
      items: [
        { id: 'E8301', label: '8301' },
        { id: 'E8302', label: '8302' },
        { id: 'E8303', label: '8303' },
        { id: 'E8304', label: '8304' },
        { id: 'EPW8305', label: 'PW 8305' },
        { id: 'E8306', label: '8306' },
        { id: 'E8307', label: '8307' },
      ],
    },
    {
      id: 'FURGONETAS',
      label: 'Furgoneta',
      emoji: '🚐',
      items: [
        { id: 'TP5509', label: 'TP 5509' },
        { id: '5268', label: '5268' },
        { id: '5269', label: '5269' },
        { id: '5274', label: '5274' },
        { id: '5267', label: '5267' },
      ],
    },
    {
      id: 'GPUS',
      label: "GPU's",
      emoji: '🔌',
      items: [
        { id: 'BC8401', label: 'BC 8401' },
        { id: 'BC8406', label: 'BC 8406' },
        { id: 'AZ8404', label: 'AZ 8404' },
        { id: 'AZ8405', label: 'AZ 8405' },
        { id: 'GT8407', label: 'GT 8407' },
        { id: 'GPUGASOIL', label: 'GPU Gasoil' },
      ],
    },
    {
      id: 'PUSHBACK',
      label: 'Pushback',
      emoji: '🚛',
      items: small ? SMALL_PUSHBACK_ITEMS : ALL_PUSHBACK_ITEMS,
    },
    {
      id: 'PLATAFORMAS_GD',
      label: 'Plataformas Grandes',
      emoji: '🏗️',
      items: [
        { id: 'CA8204', label: 'CA 8204' },
        { id: 'GT8205', label: 'GT 8205' },
        { id: 'TP8209', label: 'TP 8209' },
        { id: 'SEV4267', label: 'SEV 4267' },
        { id: 'CH708203', label: 'CH70 8203' },
      ],
    },
    {
      id: 'PLATAFORMAS_PQ',
      label: 'Plataformas Pequeñas',
      emoji: '🏗️',
      items: [
        { id: '8210', label: '8210' },
        { id: '8211', label: '8211' },
        { id: '8201', label: '8201' },
      ],
    },
    {
      id: 'TRANSFER',
      label: 'Transfer',
      emoji: '🚚',
      items: [
        { id: '81300', label: '81300' },
        { id: '81301', label: '81301' },
        { id: '81302', label: '81302' },
        { id: '81303', label: '81303' },
      ],
    },
    {
      id: 'JARDINERAS',
      label: 'Jardinera',
      emoji: '🚌',
      items: [
        { id: 'J8503', label: '8503' },
        { id: 'J9016', label: '9016' },
        { id: 'J4609', label: '4609' },
        { id: 'J8502', label: '8502' },
        { id: 'J8501', label: '8501' },
      ],
    },
  ];
};

export interface EquipmentSelection {
  categoryId: string;
  equipmentId: string;
  percentage: string; // stored as string for input flexibility
}
