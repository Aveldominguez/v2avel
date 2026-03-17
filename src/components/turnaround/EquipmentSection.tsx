import React, { useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Wrench } from 'lucide-react';
import { getEquipmentCategories, EquipmentSelection } from '@/data/equipmentDefinitions';

interface EquipmentSectionProps {
  aircraftModel: string | null;
  equipment: EquipmentSelection[];
  onChange: (equipment: EquipmentSelection[]) => void;
}

const EquipmentSection: React.FC<EquipmentSectionProps> = ({ aircraftModel, equipment, onChange }) => {
  const categories = useMemo(() => getEquipmentCategories(aircraftModel), [aircraftModel]);

  const getSelection = (categoryId: string): EquipmentSelection | undefined => {
    return equipment.find(e => e.categoryId === categoryId);
  };

  const handleEquipmentChange = (categoryId: string, equipmentId: string) => {
    const existing = equipment.filter(e => e.categoryId !== categoryId);
    if (equipmentId === '__none__') {
      onChange(existing);
    } else {
      const prev = getSelection(categoryId);
      onChange([...existing, { categoryId, equipmentId, percentage: prev?.percentage || '' }]);
    }
  };

  const handlePercentageChange = (categoryId: string, percentage: string) => {
    // Only allow numbers 0-100
    const clean = percentage.replace(/[^0-9]/g, '');
    const num = parseInt(clean, 10);
    const val = clean === '' ? '' : (num > 100 ? '100' : clean);

    onChange(equipment.map(e =>
      e.categoryId === categoryId ? { ...e, percentage: val } : e
    ));
  };

  const selectedCount = equipment.length;

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
            <CardContent className="pt-4 space-y-4">
              {categories.map(category => {
                const selection = getSelection(category.id);
                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category.emoji}</span>
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                        {category.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selection?.equipmentId || '__none__'}
                        onValueChange={(val) => handleEquipmentChange(category.id, val)}
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
                          value={selection?.percentage || ''}
                          onChange={(e) => handlePercentageChange(category.id, e.target.value)}
                          disabled={!selection}
                          className="h-10 text-center pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
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
