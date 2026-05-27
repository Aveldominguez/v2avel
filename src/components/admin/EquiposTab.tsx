import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, Save } from 'lucide-react';
import type { EquipmentCategoryRow, EquipmentUnitRow, FuelType } from '@/types/equipment';

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const EquiposTab: React.FC = () => {
  const [categories, setCategories] = useState<EquipmentCategoryRow[]>([]);
  const [units, setUnits] = useState<EquipmentUnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const reload = async () => {
    const [cats, us] = await Promise.all([
      supabase.from('catalog_equipment_categories').select('*').order('sort_order'),
      supabase.from('catalog_equipment_units').select('*').order('sort_order'),
    ]);
    setCategories((cats.data as any) || []);
    setUnits((us.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  // ─── Categories ───
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const id = slugify(newCatName);
    if (categories.some(c => c.id === id)) {
      toast({ title: 'Ya existe', description: 'Una categoría con ese nombre ya existe.', variant: 'destructive' });
      return;
    }
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0);
    setSaving(true);
    const { error } = await supabase.from('catalog_equipment_categories').insert({
      id, name: newCatName.toUpperCase(), icon: 'Package', sort_order: maxOrder + 10, active: true,
    });
    setSaving(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setNewCatName(''); reload(); }
  };

  const handleUpdateCategory = async (id: string, patch: Partial<EquipmentCategoryRow>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    await supabase.from('catalog_equipment_categories').update(patch).eq('id', id);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('¿Eliminar la categoría y todos sus equipos?')) return;
    setSaving(true);
    await supabase.from('catalog_equipment_units').delete().eq('category_id', id);
    await supabase.from('catalog_equipment_categories').delete().eq('id', id);
    setSaving(false);
    reload();
  };

  // ─── Units ───
  const handleAddUnit = async (categoryId: string) => {
    const catUnits = units.filter(u => u.category_id === categoryId);
    const maxOrder = catUnits.reduce((m, u) => Math.max(m, u.sort_order), 0);
    const baseId = `${categoryId}_new_${Date.now()}`;
    setSaving(true);
    const { error } = await supabase.from('catalog_equipment_units').insert({
      id: baseId, category_id: categoryId, code: 'NUEVO', label: 'NUEVO',
      fuel_type: 'battery', is_separator: false, sort_order: maxOrder + 10, active: true,
    });
    setSaving(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else reload();
  };

  const handleUpdateUnit = async (id: string, patch: Partial<EquipmentUnitRow>) => {
    setUnits(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
    await supabase.from('catalog_equipment_units').update(patch).eq('id', id);
  };

  const handleDeleteUnit = async (id: string) => {
    if (!confirm('¿Eliminar este equipo?')) return;
    await supabase.from('catalog_equipment_units').delete().eq('id', id);
    reload();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Add new category */}
      <Card>
        <CardContent className="flex items-end gap-2 p-4">
          <div className="flex-1">
            <Label className="text-xs">Nueva categoría</Label>
            <Input
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="Nombre de la categoría"
              className="mt-1"
            />
          </div>
          <Button onClick={handleAddCategory} disabled={saving || !newCatName.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Añadir
          </Button>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="space-y-2">
        {categories.map(cat => {
          const catUnits = units.filter(u => u.category_id === cat.id);
          return (
            <AccordionItem key={cat.id} value={cat.id} className="rounded-lg border border-border bg-card">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex flex-1 items-center justify-between gap-3 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold uppercase">{cat.name}</span>
                    <span className="text-xs text-muted-foreground">({catUnits.length})</span>
                  </div>
                  <Switch
                    checked={cat.active}
                    onClick={e => e.stopPropagation()}
                    onCheckedChange={(v) => handleUpdateCategory(cat.id, { active: v })}
                  />
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3">
                  {/* Edit category fields */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Nombre</Label>
                      <Input
                        value={cat.name}
                        onChange={e => handleUpdateCategory(cat.id, { name: e.target.value.toUpperCase() })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Orden</Label>
                      <Input
                        type="number"
                        value={cat.sort_order}
                        onChange={e => handleUpdateCategory(cat.id, { sort_order: parseInt(e.target.value, 10) || 0 })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Units table */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-[1fr_1fr_110px_90px_36px] items-center gap-2 px-1 text-[10px] font-bold uppercase text-muted-foreground">
                      <span>Código</span>
                      <span>Etiqueta</span>
                      <span>Tipo</span>
                      <span>Separador</span>
                      <span />
                    </div>
                    {catUnits.map(unit => (
                      <div key={unit.id} className="grid grid-cols-[1fr_1fr_110px_90px_36px] items-center gap-2 rounded border border-border/60 bg-muted/20 p-1">
                        <Input
                          value={unit.code}
                          onChange={e => handleUpdateUnit(unit.id, { code: e.target.value })}
                          className="h-8 font-mono text-xs"
                        />
                        <Input
                          value={unit.label}
                          onChange={e => handleUpdateUnit(unit.id, { label: e.target.value })}
                          className="h-8 text-xs"
                        />
                        <Select
                          value={unit.fuel_type}
                          onValueChange={(v: FuelType) => handleUpdateUnit(unit.id, { fuel_type: v })}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="battery">Eléctrico</SelectItem>
                            <SelectItem value="fuel">Combustión</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex justify-center">
                          <Switch
                            checked={unit.is_separator}
                            onCheckedChange={(v) => handleUpdateUnit(unit.id, { is_separator: v })}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteUnit(unit.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => handleAddUnit(cat.id)} className="mt-2">
                      <Plus className="mr-1 h-4 w-4" /> Añadir equipo
                    </Button>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-border">
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteCategory(cat.id)}>
                      <Trash2 className="mr-1 h-4 w-4" /> Eliminar categoría
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default EquiposTab;
