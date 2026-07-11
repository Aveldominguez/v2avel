import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wrench, Plus, X, Zap } from 'lucide-react';
import { getFilteredEquipmentCategories, EquipmentSelection } from '@/data/equipmentDefinitions';
import { AirlineCode } from '@/types/turnaround';
import { useEquipment, updateParking, updateBattery, toggleCharging } from '@/hooks/useEquipment';
import type { EquipmentUnitFull } from '@/types/equipment';

interface EquipmentSectionProps {
  airline: AirlineCode;
  aircraftModel: string | null;
  isRemote: boolean;
  pushBack: boolean;
  equipment: EquipmentSelection[];
  onChange: (equipment: EquipmentSelection[]) => void;
}

// Map the hardcoded UPPERCASE category ID to the lowercase BD category ID
const CATEGORY_BD_MAP: Record<string, string> = {
  TRACTORES: 'tractores',
  CINTAS: 'cintas',
  ESCALERAS: 'escaleras',
  FURGONETAS: 'furgonetas',
  GPUS: 'gpus',
  PUSHBACK: 'pushback',
  PLATAFORMAS_GD: 'plataformas-gd',
  PLATAFORMAS_PQ: 'plataformas-pq',
  TRANSFER: 'transfer',
  JARDINERAS: 'jardineras',
};

// Normalize label/code for matching (case-insensitive, no spaces)
const norm = (s: string) => s.replace(/\s+/g, '').toUpperCase();

const EquipmentStateEditor = ({
  unit,
  isAutonomy,
}: {
  unit: EquipmentUnitFull;
  isAutonomy: boolean;
}) => {
  const state = unit.state;
  const isCharging = state?.is_charging ?? false;
  const isBroken = state?.is_broken ?? false;
  const battery = state?.battery_level ?? null;
  const parking = state?.parking ?? '';
  const [parkingInput, setParkingInput] = useState(parking);
  const [batteryInput, setBatteryInput] = useState(battery !== null ? String(battery) : '');
  const parkingFocused = useRef(false);
  const batteryFocused = useRef(false);
  const parkingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batteryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!parkingFocused.current) setParkingInput(parking);
  }, [parking]);

  useEffect(() => {
    if (!batteryFocused.current) setBatteryInput(battery !== null ? String(battery) : '');
  }, [battery]);

  useEffect(() => () => {
    if (parkingTimer.current) clearTimeout(parkingTimer.current);
    if (batteryTimer.current) clearTimeout(batteryTimer.current);
  }, []);

  const scheduleParking = (value: string) => {
    if (parkingTimer.current) clearTimeout(parkingTimer.current);
    parkingTimer.current = setTimeout(() => {
      updateParking(unit.id, unit.code, unit.category_id, parking, value, 'rampa');
    }, 500);
  };

  const scheduleBattery = (value: number | null) => {
    if (batteryTimer.current) clearTimeout(batteryTimer.current);
    batteryTimer.current = setTimeout(() => {
      updateBattery(unit.id, unit.code, unit.category_id, battery, value, 'rampa');
    }, 500);
  };

  const handleParking = (value: string) => {
    const next = value.toUpperCase();
    setParkingInput(next);
    scheduleParking(next);
  };

  const handleBattery = (value: string) => {
    const clean = value.replace(/^KM\s*/i, '').replace(/\D/g, '');
    if (clean === '') {
      setBatteryInput('');
      scheduleBattery(null);
      return;
    }
    const next = isAutonomy ? Math.min(99999, parseInt(clean.slice(0, 5))) : Math.min(100, parseInt(clean));
    setBatteryInput(String(next));
    scheduleBattery(next);
  };

  const flushParking = () => {
    if (parkingTimer.current) {
      clearTimeout(parkingTimer.current);
      parkingTimer.current = null;
    }
    if (parkingInput !== parking) updateParking(unit.id, unit.code, unit.category_id, parking, parkingInput, 'rampa');
  };

  const flushBattery = () => {
    if (batteryTimer.current) {
      clearTimeout(batteryTimer.current);
      batteryTimer.current = null;
    }
    const next = batteryInput === '' ? null : parseInt(batteryInput);
    const normalized = Number.isNaN(next as number) ? null : next;
    if (normalized !== battery) updateBattery(unit.id, unit.code, unit.category_id, battery, normalized, 'rampa');
  };

  return (
    <div className="ml-2 mt-1 flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Parking</span>
      <Input
        value={parkingInput}
        onFocus={() => { parkingFocused.current = true; }}
        onBlur={() => { parkingFocused.current = false; flushParking(); }}
        onChange={(e) => handleParking(e.target.value)}
        disabled={isBroken || isCharging}
        placeholder="—"
        className="h-8 w-16 px-1 text-center font-mono text-xs uppercase"
      />
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {isAutonomy ? 'Autonomía' : 'Batería'}
      </span>
      {isBroken ? (
        <span className="flex-1 text-center text-xs font-semibold italic text-destructive">EN TALLER</span>
      ) : isCharging ? (
        <div className="flex flex-1 items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs font-semibold italic text-success">
            <Zap className="h-3 w-3" /> Cargando
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toggleCharging(unit.id, unit.code, unit.category_id, true, 'rampa')}
            className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider"
          >
            Activar
          </Button>
        </div>
      ) : (
        <Input
          value={isAutonomy && batteryInput ? `KM ${batteryInput}` : batteryInput}
          onFocus={() => { batteryFocused.current = true; }}
          onBlur={() => { batteryFocused.current = false; flushBattery(); }}
          onChange={(e) => handleBattery(e.target.value)}
          placeholder={isAutonomy ? 'KM —' : '—'}
          className="h-8 flex-1 px-1 text-center font-mono text-xs"
        />
      )}
    </div>
  );
};

const EquipmentSection: React.FC<EquipmentSectionProps> = ({ airline, aircraftModel, isRemote, pushBack, equipment, onChange }) => {
  const categories = useMemo(() => getFilteredEquipmentCategories(airline, isRemote, aircraftModel, pushBack), [airline, isRemote, aircraftModel, pushBack]);
  const { fullCategories } = useEquipment();

  // Build lookup: hardcoded categoryId -> Map<normalizedCode, EquipmentUnitFull>
  const bdLookup = useMemo(() => {
    const map: Record<string, Map<string, EquipmentUnitFull>> = {};
    categories.forEach(cat => {
      const bdId = CATEGORY_BD_MAP[cat.id];
      const bdCat = fullCategories.find(c => c.id === bdId);
      const codeMap = new Map<string, EquipmentUnitFull>();
      bdCat?.units.forEach(u => { if (!u.is_separator) codeMap.set(norm(u.code), u); });
      map[cat.id] = codeMap;
    });
    return map;
  }, [categories, fullCategories]);

  const getBdUnit = (categoryId: string, itemLabel: string): EquipmentUnitFull | undefined =>
    bdLookup[categoryId]?.get(norm(itemLabel));

  const getSelections = (categoryId: string): EquipmentSelection[] => equipment.filter(e => e.categoryId === categoryId);

  const getAvailableItems = (categoryId: string, currentEquipmentId?: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return [];
    const usedIds = equipment
      .filter(e => e.categoryId === categoryId && e.equipmentId !== currentEquipmentId)
      .map(e => e.equipmentId);
    return category.items.filter(item => {
      if (usedIds.includes(item.id)) return false;
      const bd = getBdUnit(categoryId, item.label);
      // Hide units marked as broken (en taller)
      if (bd?.state?.is_broken) return false;
      return true;
    });
  };

  const handleEquipmentChange = (categoryId: string, index: number, equipmentId: string) => {
    const catSelections = getSelections(categoryId);
    const others = equipment.filter(e => e.categoryId !== categoryId);

    if (equipmentId === '__none__') {
      const updated = catSelections.filter((_, i) => i !== index);
      onChange([...others, ...updated]);
    } else {
      const updated = catSelections.map((sel, i) => i === index ? { ...sel, equipmentId } : sel);
      onChange([...others, ...updated]);
    }
  };


  const handleAdd = (categoryId: string) => {
    onChange([...equipment, { categoryId, equipmentId: '', percentage: '' }]);
  };

  const handleRemove = (categoryId: string, index: number) => {
    const catSelections = getSelections(categoryId);
    const others = equipment.filter(e => e.categoryId !== categoryId);
    const updated = catSelections.filter((_, i) => i !== index);
    onChange([...others, ...updated]);
  };

  const selectedCount = equipment.filter(e => e.equipmentId).length;

  // Mini editor rendered under each selected equipment row
  const renderStateEditor = (categoryId: string, equipmentId: string) => {
    const item = categories.find(c => c.id === categoryId)?.items.find(i => i.id === equipmentId);
    if (!item) return null;
    const bd = getBdUnit(categoryId, item.label);
    if (!bd) return null;
    const isAutonomy = categoryId === 'FURGONETAS';
    return <EquipmentStateEditor key={bd.id} unit={bd} isAutonomy={isAutonomy} />;
  };

  const renderSelectItem = (item: { id: string; label: string }, categoryId: string) => {
    const bd = getBdUnit(categoryId, item.label);
    const isCharging = bd?.state?.is_charging ?? false;
    return (
      <SelectItem key={item.id} value={item.id}>
        <span className="flex items-center gap-2">
          {item.label}
          {isCharging && (
            <span className="inline-flex items-center gap-0.5 rounded bg-success/15 px-1 py-0.5 text-[10px] font-semibold text-success">
              <Zap className="h-2.5 w-2.5" /> Cargando
            </span>
          )}
        </span>
      </SelectItem>
    );
  };

  return (
    <Card className="card-operational">
      <Accordion type="single" collapsible>
        <AccordionItem value="equipment" className="border-none">
          <CardHeader className="pb-3">
            <AccordionTrigger className="py-0 hover:no-underline">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-muted">
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <span>Equipos utilizados</span>
                  <p className="text-xs font-normal text-muted-foreground mt-0.5">
                    {selectedCount === 0 ? 'Ninguno seleccionado' : `${selectedCount} equipo${selectedCount > 1 ? 's' : ''} seleccionado${selectedCount > 1 ? 's' : ''}`}
                  </p>
                </div>
              </CardTitle>
            </AccordionTrigger>
          </CardHeader>
          <AccordionContent>
            <CardContent className="pt-4 space-y-5">
              {categories.map(category => {
                const selections = getSelections(category.id);
                const availableForNew = getAvailableItems(category.id);
                const canAdd = availableForNew.length > 0;

                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{category.emoji}</span>
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider">{category.label}</span>
                      </div>
                      {canAdd && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleAdd(category.id)} className="h-7 w-7 p-0 text-primary hover:bg-primary/10">
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {selections.length === 0 && (
                      <div className="flex items-center gap-2">
                        <Select
                          value="__none__"
                          onValueChange={(val) => {
                            if (val !== '__none__') onChange([...equipment, { categoryId: category.id, equipmentId: val, percentage: '' }]);
                          }}
                        >
                          <SelectTrigger className="flex-1 h-10"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">—</SelectItem>
                            {availableForNew.map(item => renderSelectItem(item, category.id))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {selections.map((sel, idx) => {
                      const available = getAvailableItems(category.id, sel.equipmentId);
                      return (
                        <div key={`${category.id}-${idx}`} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Select value={sel.equipmentId || '__none__'} onValueChange={(val) => handleEquipmentChange(category.id, idx, val)}>
                              <SelectTrigger className="flex-1 h-10"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">—</SelectItem>
                                {available.map(item => renderSelectItem(item, category.id))}
                              </SelectContent>
                            </Select>
                            {selections.length > 1 && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemove(category.id, idx)} className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 shrink-0">
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          {sel.equipmentId && renderStateEditor(category.id, sel.equipmentId)}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};

export default EquipmentSection;
