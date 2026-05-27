export type FuelType = 'battery' | 'fuel';

export interface EquipmentCategoryRow {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  active: boolean;
}

export interface EquipmentUnitRow {
  id: string;
  category_id: string;
  code: string;
  label: string;
  fuel_type: FuelType;
  is_separator: boolean;
  sort_order: number;
  active: boolean;
}

export interface EquipmentStateRow {
  unit_id: string;
  parking: string;
  battery_level: number | null;
  is_charging: boolean;
  charging_since: string | null;
  is_broken: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface EquipmentUnitFull extends EquipmentUnitRow {
  state: EquipmentStateRow | null;
}

export interface EquipmentCategoryFull extends EquipmentCategoryRow {
  units: EquipmentUnitFull[];
}

export type ModuleKey = 'rampa' | 'equipos';
