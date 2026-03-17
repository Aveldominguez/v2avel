import React, { useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wrench, Plus, X } from 'lucide-react';
import { getEquipmentCategories, EquipmentSelection } from '@/data/equipmentDefinitions';

interface EquipmentSectionProps {
  aircraftModel: string | null;
  equipment: EquipmentSelection[];
  onChange: (equipment: EquipmentSelection[]) => void;
}

const EquipmentSection: React.FC<EquipmentSectionProps> = ({ aircraftModel, equipment, onChange }) => {
  const categories = useMemo(() => getEquipmentCategories(aircraftModel), [aircraftModel]);

  const getSelections = (categoryId: string): EquipmentSelection[] => {
    return equipment.filter(e => e.categoryId === categoryId);
  };

  const getAvailableItems = (categoryId: string, currentEquipmentId?: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return [];
    const usedIds = equipment
      .filter(e => e.categoryId === categoryId && e.equipmentId !== currentEquipmentId)
      .map(e => e.equipmentId);
    return category.items.filter(item => !usedIds.includes(item.id));
  };

  const handleEquipmentChange = (categoryId: string, index: number, equipmentId: string) => {
    const catSelections = getSelections(categoryId);
    const others = equipment.filter(e => e.categoryId !== categoryId);

    if (equipmentId === '__none__') {
      // Remove this slot
      const updated = catSelections.filter((_, i) => i !== index);
      onChange([...others, ...updated]);
    } else {
      const updated = catSelections.map((sel, i) =>
        i === index ? { ...sel, equipmentId } : sel
      );
      onChange([...others, ...updated]);
    }
  };

  const handlePercentageChange = (categoryId: string, index: number, percentage: string) => {
    const clean = percentage.replace(/[^0-9]/g, '');
    const num = parseInt(clean, 10);
    const val = clean === '' ? '' : (num > 100 ? '100' : clean);

    const catSelections = getSelections(categoryId);
    const others = equipment.filter(e => e.categoryId !== categoryId);
    const updated = catSelections.map((sel, i) =>
      i === index ? { ...sel, percentage: val } : sel
    );
    onChange([...others, ...updated]);
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

  return (
    <Card className="card-operational">
      <Accordion type="single" collapsible>
        <AccordionItem value="equipment" className="border-none">
          <CardHeader className="pb-0">
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
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                          {category.label}
                        </span>
                      </div>
                      {canAdd && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAdd(category.id)}
                          className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {selections.length === 0 && (
                      <div className="flex items-center gap-2">
                        <Select
                          value="__none__"
                          onValueChange={(val) => {
                            if (val !== '__none__') {
                              onChange([...equipment, { categoryId: category.id, equipmentId: val, percentage: '' }]);
                            }
                          }}
                        >
                          <SelectTrigger className="flex-1 h-10">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">—</SelectItem>
                            {category.items.map(item => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="relative w-20 shrink-0">
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="—"
                            disabled
                            className="h-10 text-center pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                        </div>
                      </div>
                    )}

                    {selections.map((sel, idx) => {
                      const available = getAvailableItems(category.id, sel.equipmentId);
                      return (
                        <div key={`${category.id}-${idx}`} className="flex items-center gap-2">
                          <Select
                            value={sel.equipmentId || '__none__'}
                            onValueChange={(val) => handleEquipmentChange(category.id, idx, val)}
                          >
                            <SelectTrigger className="flex-1 h-10">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">—</SelectItem>
                              {available.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="relative w-20 shrink-0">
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="—"
                              value={sel.percentage}
                              onChange={(e) => handlePercentageChange(category.id, idx, e.target.value)}
                              className="h-10 text-center pr-6"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                          </div>
                          {selections.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemove(category.id, idx)}
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
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
