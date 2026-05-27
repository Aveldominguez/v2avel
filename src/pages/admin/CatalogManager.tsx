import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useCatalog, refreshCatalog } from '@/hooks/useCatalog';
import { AIRLINES, AirlineCode, getAllAirlines, getTimeFieldsForAirline } from '@/types/turnaround';
import { AIRCRAFT_MODELS } from '@/data/aircraftModels';
import { getFieldsByAirline, ALL_FIELD_DEFINITIONS } from '@/data/fieldDefinitions';
import { getCompartmentsByAirline, isPairedHold, type CompartmentDefinition } from '@/data/compartmentDefinitions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Save, Plus, Trash2 } from 'lucide-react';

const CatalogManager: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  useCatalog();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/admin');
  }, [loading, isAdmin, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const handleGlobalSave = async () => {
    setRefreshing(true);
    await refreshCatalog();
    setRefreshing(false);
    toast({ title: 'Catálogo recargado', description: 'Todos los cambios guardados están aplicados.' });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 sticky top-0 z-20 bg-background py-2 border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Volver
            </Button>
            <h1 className="text-xl font-bold">Gestión de Catálogos</h1>
          </div>
          <Button onClick={handleGlobalSave} disabled={refreshing} variant="default" size="sm">
            {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar y recargar
          </Button>
        </div>

        <Tabs defaultValue="airlines">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="airlines">Aerolíneas</TabsTrigger>
            <TabsTrigger value="models">Modelos</TabsTrigger>
            <TabsTrigger value="loadcodes">Comoditys</TabsTrigger>
            <TabsTrigger value="compartments">Bodegas</TabsTrigger>
            <TabsTrigger value="timefields">Horas</TabsTrigger>
          </TabsList>

          <TabsContent value="airlines"><AirlinesTab /></TabsContent>
          <TabsContent value="models"><ModelsTab /></TabsContent>
          <TabsContent value="loadcodes"><LoadCodesTab /></TabsContent>
          <TabsContent value="compartments"><CompartmentsTab /></TabsContent>
          <TabsContent value="timefields"><TimeFieldsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ============================================================
// AIRLINES TAB
// ============================================================
const AirlinesTab: React.FC = () => {
  const catalog = useCatalog();
  const [saving, setSaving] = useState<string | null>(null);
  const [newAirline, setNewAirline] = useState({ code: '', name: '', shortName: '', color: 'hsl(210, 80%, 50%)' });

  const baseRows = AIRLINES.map(a => {
    const ov = catalog.airlines.find(o => o.code === a.code);
    return {
      code: a.code,
      name: ov?.name ?? a.name,
      shortName: ov?.shortName ?? a.shortName,
      color: ov?.color ?? a.color,
      active: ov?.active ?? true,
      isCustom: false,
    };
  });
  const extraRows = catalog.airlines
    .filter(o => !AIRLINES.some(a => a.code === o.code))
    .map(o => ({ code: o.code, name: o.name, shortName: o.shortName, color: o.color, active: o.active, isCustom: true }));
  const rows = [...baseRows, ...extraRows];

  const [edits, setEdits] = useState<Record<string, Partial<{ name: string; shortName: string; color: string; active: boolean }>>>({});

  const save = async (code: string) => {
    const edit = edits[code];
    if (!edit) return;
    setSaving(code);
    const row = rows.find(r => r.code === code)!;
    const { error } = await supabase.from('catalog_airlines').upsert({
      code,
      name: edit.name ?? row.name,
      short_name: edit.shortName ?? row.shortName,
      color: edit.color ?? row.color,
      active: edit.active ?? row.active,
      sort_order: 0,
    }, { onConflict: 'code' });
    setSaving(null);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      setEdits(prev => { const n = { ...prev }; delete n[code]; return n; });
      await refreshCatalog();
    }
  };

  const remove = async (code: string, isCustom: boolean) => {
    const label = isCustom ? 'eliminar permanentemente' : 'desactivar (soft-delete vía override)';
    if (!confirm(`¿Seguro que quieres ${label} la aerolínea ${code}?`)) return;
    setSaving(code);
    if (isCustom) {
      const { error } = await supabase.from('catalog_airlines').delete().eq('code', code);
      setSaving(null);
      if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      const row = rows.find(r => r.code === code)!;
      const { error } = await supabase.from('catalog_airlines').upsert({
        code, name: row.name, short_name: row.shortName, color: row.color, active: false, sort_order: 0,
      }, { onConflict: 'code' });
      setSaving(null);
      if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    await refreshCatalog();
  };

  const addNewAirline = async () => {
    const code = newAirline.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!code || !newAirline.name.trim()) {
      toast({ title: 'Faltan datos', description: 'Código interno y nombre son obligatorios', variant: 'destructive' });
      return;
    }
    if (rows.some(r => r.code === code)) {
      toast({ title: 'Código ya existe', variant: 'destructive' });
      return;
    }
    setSaving('__new__');
    const { error } = await supabase.from('catalog_airlines').insert({
      code, name: newAirline.name.trim(),
      short_name: (newAirline.shortName.trim() || newAirline.name.trim()).toUpperCase(),
      color: newAirline.color, active: true, sort_order: 1000,
    });
    setSaving(null);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setNewAirline({ code: '', name: '', shortName: '', color: 'hsl(210, 80%, 50%)' }); await refreshCatalog(); }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Aerolíneas</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead><TableHead>Nombre</TableHead><TableHead>Corto</TableHead>
              <TableHead>Color HSL</TableHead><TableHead>Activo</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => {
              const e = edits[r.code] || {};
              return (
                <TableRow key={r.code}>
                  <TableCell className="font-mono text-xs">{r.code}{r.isCustom && <span className="ml-1 text-[10px] text-primary">NEW</span>}</TableCell>
                  <TableCell><Input value={e.name ?? r.name} onChange={ev => setEdits(p => ({ ...p, [r.code]: { ...p[r.code], name: ev.target.value } }))} /></TableCell>
                  <TableCell><Input value={e.shortName ?? r.shortName} onChange={ev => setEdits(p => ({ ...p, [r.code]: { ...p[r.code], shortName: ev.target.value } }))} /></TableCell>
                  <TableCell><Input value={e.color ?? r.color} onChange={ev => setEdits(p => ({ ...p, [r.code]: { ...p[r.code], color: ev.target.value } }))} /></TableCell>
                  <TableCell><Switch checked={e.active ?? r.active} onCheckedChange={v => setEdits(p => ({ ...p, [r.code]: { ...p[r.code], active: v } }))} /></TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" disabled={!edits[r.code] || saving === r.code} onClick={() => save(r.code)}>
                      {saving === r.code ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="destructive" disabled={saving === r.code} onClick={() => remove(r.code, r.isCustom)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Añadir nueva aerolínea</h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
            <div><Label>Código interno</Label><Input value={newAirline.code} onChange={e => setNewAirline(p => ({ ...p, code: e.target.value }))} placeholder="RYANAIR" className="font-mono uppercase" /></div>
            <div><Label>Nombre</Label><Input value={newAirline.name} onChange={e => setNewAirline(p => ({ ...p, name: e.target.value }))} placeholder="Ryanair" /></div>
            <div><Label>Corto</Label><Input value={newAirline.shortName} onChange={e => setNewAirline(p => ({ ...p, shortName: e.target.value }))} placeholder="RYANAIR" /></div>
            <div><Label>Color HSL</Label><Input value={newAirline.color} onChange={e => setNewAirline(p => ({ ...p, color: e.target.value }))} /></div>
            <Button onClick={addNewAirline} disabled={saving === '__new__'}>
              {saving === '__new__' ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Añadir</>}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================
// MODELS TAB
// ============================================================
const ModelsTab: React.FC = () => {
  const catalog = useCatalog();
  const [airline, setAirline] = useState<AirlineCode>('WIZZ');
  const [saving, setSaving] = useState(false);
  const [newModel, setNewModel] = useState({ modelCode: '', label: '', turnaroundMinutes: 45, cleaningMinutes: '' });

  const base = AIRCRAFT_MODELS[airline] || [];
  const ovs = catalog.aircraftModels.filter(m => m.airlineCode === airline);
  const rows = [
    ...base.map(b => {
      const ov = ovs.find(o => o.modelCode === b.model);
      return {
        modelCode: b.model,
        label: ov?.label ?? b.label,
        turnaroundMinutes: ov?.turnaroundMinutes ?? b.turnaroundMinutes,
        cleaningMinutes: ov?.cleaningMinutes ?? b.cleaningMinutes ?? null,
        active: ov?.active ?? true,
        isExtra: false,
        ovId: ov?.id,
      };
    }),
    ...ovs.filter(o => !base.some(b => b.model === o.modelCode)).map(o => ({
      modelCode: o.modelCode, label: o.label, turnaroundMinutes: o.turnaroundMinutes,
      cleaningMinutes: o.cleaningMinutes, active: o.active, isExtra: true, ovId: o.id,
    })),
  ];

  const [edits, setEdits] = useState<Record<string, any>>({});

  const save = async (modelCode: string) => {
    const e = edits[modelCode];
    if (!e) return;
    const r = rows.find(x => x.modelCode === modelCode)!;
    setSaving(true);
    const { error } = await supabase.from('catalog_aircraft_models').upsert({
      airline_code: airline,
      model_code: modelCode,
      label: e.label ?? r.label,
      turnaround_minutes: e.turnaroundMinutes ?? r.turnaroundMinutes,
      cleaning_minutes: e.cleaningMinutes ?? r.cleaningMinutes,
      active: e.active ?? r.active,
      sort_order: 0,
    }, { onConflict: 'airline_code,model_code' });
    setSaving(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setEdits(p => { const n = { ...p }; delete n[modelCode]; return n; }); await refreshCatalog(); }
  };

  const remove = async (row: typeof rows[number]) => {
    const label = row.isExtra ? 'eliminar permanentemente' : 'desactivar (soft-delete vía override)';
    if (!confirm(`¿Seguro que quieres ${label} el modelo ${row.modelCode}?`)) return;
    setSaving(true);
    if (row.isExtra && row.ovId) {
      const { error } = await supabase.from('catalog_aircraft_models').delete().eq('id', row.ovId);
      setSaving(false);
      if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      const { error } = await supabase.from('catalog_aircraft_models').upsert({
        airline_code: airline, model_code: row.modelCode, label: row.label,
        turnaround_minutes: row.turnaroundMinutes, cleaning_minutes: row.cleaningMinutes,
        active: false, sort_order: 0,
      }, { onConflict: 'airline_code,model_code' });
      setSaving(false);
      if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    await refreshCatalog();
  };

  const addNew = async () => {
    if (!newModel.modelCode || !newModel.label) {
      toast({ title: 'Faltan datos', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('catalog_aircraft_models').insert({
      airline_code: airline,
      model_code: newModel.modelCode.toUpperCase(),
      label: newModel.label,
      turnaround_minutes: Number(newModel.turnaroundMinutes) || 45,
      cleaning_minutes: newModel.cleaningMinutes ? Number(newModel.cleaningMinutes) : null,
    });
    setSaving(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setNewModel({ modelCode: '', label: '', turnaroundMinutes: 45, cleaningMinutes: '' }); await refreshCatalog(); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modelos de avión</CardTitle>
        <div className="mt-2">
          <Label>Aerolínea</Label>
          <Select value={airline} onValueChange={v => setAirline(v as AirlineCode)}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>{getAllAirlines().map(a => <SelectItem key={a.code} value={a.code}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead><TableHead>Etiqueta</TableHead><TableHead>Turnaround</TableHead>
              <TableHead>Limpieza</TableHead><TableHead>Activo</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => {
              const e = edits[r.modelCode] || {};
              return (
                <TableRow key={r.modelCode}>
                  <TableCell className="font-mono text-xs">{r.modelCode}{r.isExtra && <span className="ml-1 text-[10px] text-primary">NEW</span>}</TableCell>
                  <TableCell><Input value={e.label ?? r.label} onChange={ev => setEdits(p => ({ ...p, [r.modelCode]: { ...p[r.modelCode], label: ev.target.value } }))} /></TableCell>
                  <TableCell><Input type="number" value={e.turnaroundMinutes ?? r.turnaroundMinutes} onChange={ev => setEdits(p => ({ ...p, [r.modelCode]: { ...p[r.modelCode], turnaroundMinutes: Number(ev.target.value) } }))} /></TableCell>
                  <TableCell><Input type="number" value={e.cleaningMinutes ?? r.cleaningMinutes ?? ''} onChange={ev => setEdits(p => ({ ...p, [r.modelCode]: { ...p[r.modelCode], cleaningMinutes: ev.target.value ? Number(ev.target.value) : null } }))} /></TableCell>
                  <TableCell><Switch checked={e.active ?? r.active} onCheckedChange={v => setEdits(p => ({ ...p, [r.modelCode]: { ...p[r.modelCode], active: v } }))} /></TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" disabled={!edits[r.modelCode] || saving} onClick={() => save(r.modelCode)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}</Button>
                    <Button size="sm" variant="destructive" disabled={saving} onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Añadir nuevo modelo</h3>
          <div className="grid grid-cols-5 gap-2 items-end">
            <div><Label>Código</Label><Input placeholder="A350" value={newModel.modelCode} onChange={e => setNewModel(p => ({ ...p, modelCode: e.target.value }))} /></div>
            <div><Label>Etiqueta</Label><Input placeholder="A350-900" value={newModel.label} onChange={e => setNewModel(p => ({ ...p, label: e.target.value }))} /></div>
            <div><Label>Turnaround</Label><Input type="number" value={newModel.turnaroundMinutes} onChange={e => setNewModel(p => ({ ...p, turnaroundMinutes: Number(e.target.value) }))} /></div>
            <div><Label>Limpieza</Label><Input type="number" value={newModel.cleaningMinutes} onChange={e => setNewModel(p => ({ ...p, cleaningMinutes: e.target.value as any }))} /></div>
            <Button onClick={addNew} disabled={saving}><Plus className="h-4 w-4 mr-1" /> Añadir</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================
// LOAD CODES TAB (Comoditys) — merges hardcoded + overrides
// ============================================================
const LoadCodesTab: React.FC = () => {
  const catalog = useCatalog();
  const [airline, setAirline] = useState<AirlineCode>('WIZZ');
  const [newCode, setNewCode] = useState({ code: '', label: '' });
  const [saving, setSaving] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { label?: string }>>({});

  // Use the same getter the app uses → merges hardcoded + overrides
  const merged = getFieldsByAirline(airline);
  const baseCodes = new Set(ALL_FIELD_DEFINITIONS.filter(f => f.airline === airline).map(f => f.code));

  // also include inactive overrides (getter filters them out)
  const inactiveOvs = catalog.loadCodes.filter(l => l.airlineCode === airline && !l.active);

  const rows = [
    ...merged.map(f => {
      const ov = catalog.loadCodes.find(o => o.airlineCode === airline && o.code === f.code);
      return { code: f.code, label: f.label, active: ov?.active ?? true, ovId: ov?.id, isCustom: !baseCodes.has(f.code) };
    }),
    ...inactiveOvs.filter(o => baseCodes.has(o.code)).map(o => ({
      code: o.code, label: o.label, active: false, ovId: o.id, isCustom: false,
    })),
  ];

  const saveRow = async (code: string) => {
    const e = edits[code];
    if (!e?.label) return;
    setSaving(code);
    const row = rows.find(r => r.code === code)!;
    const { error } = await supabase.from('catalog_load_codes').upsert({
      airline_code: airline, code, label: e.label, sort_order: 100, active: row.active,
    }, { onConflict: 'airline_code,code' } as any);
    setSaving(null);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setEdits(p => { const n = { ...p }; delete n[code]; return n; }); await refreshCatalog(); }
  };

  const toggle = async (row: typeof rows[number], active: boolean) => {
    setSaving(row.code);
    const { error } = await supabase.from('catalog_load_codes').upsert({
      airline_code: airline, code: row.code, label: row.label, sort_order: 100, active,
    }, { onConflict: 'airline_code,code' } as any);
    setSaving(null);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else await refreshCatalog();
  };

  const remove = async (row: typeof rows[number]) => {
    const action = row.isCustom ? 'eliminar' : 'desactivar';
    if (!confirm(`¿${action} el código ${row.code}?`)) return;
    setSaving(row.code);
    if (row.isCustom && row.ovId) {
      const { error } = await supabase.from('catalog_load_codes').delete().eq('id', row.ovId);
      setSaving(null);
      if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      const { error } = await supabase.from('catalog_load_codes').upsert({
        airline_code: airline, code: row.code, label: row.label, sort_order: 100, active: false,
      }, { onConflict: 'airline_code,code' } as any);
      setSaving(null);
      if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    await refreshCatalog();
  };

  const addNew = async () => {
    if (!newCode.code || !newCode.label) return;
    setSaving('__new__');
    const { error } = await supabase.from('catalog_load_codes').insert({
      airline_code: airline, code: newCode.code.toUpperCase(), label: newCode.label, sort_order: 100,
    });
    setSaving(null);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setNewCode({ code: '', label: '' }); await refreshCatalog(); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Códigos de carga (Comoditys)</CardTitle>
        <div className="mt-2">
          <Label>Aerolínea</Label>
          <Select value={airline} onValueChange={v => setAirline(v as AirlineCode)}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>{getAllAirlines().map(a => <SelectItem key={a.code} value={a.code}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Código</TableHead><TableHead>Significado</TableHead><TableHead>Activo</TableHead><TableHead></TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => {
              const e = edits[r.code] || {};
              return (
                <TableRow key={r.code}>
                  <TableCell className="font-mono text-xs">{r.code}{r.isCustom && <span className="ml-1 text-[10px] text-primary">NEW</span>}</TableCell>
                  <TableCell><Input value={e.label ?? r.label} onChange={ev => setEdits(p => ({ ...p, [r.code]: { label: ev.target.value } }))} /></TableCell>
                  <TableCell><Switch checked={r.active} onCheckedChange={v => toggle(r, v)} /></TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" disabled={!edits[r.code] || saving === r.code} onClick={() => saveRow(r.code)}>
                      {saving === r.code ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="destructive" disabled={saving === r.code} onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Añadir código</h3>
          <div className="flex gap-2 items-end">
            <div><Label>Código</Label><Input value={newCode.code} onChange={e => setNewCode(p => ({ ...p, code: e.target.value }))} /></div>
            <div className="flex-1"><Label>Significado</Label><Input value={newCode.label} onChange={e => setNewCode(p => ({ ...p, label: e.target.value }))} /></div>
            <Button onClick={addNew} disabled={saving === '__new__'}><Plus className="h-4 w-4 mr-1" /> Añadir</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================
// COMPARTMENTS TAB
// ============================================================
const CompartmentsTab: React.FC = () => {
  const catalog = useCatalog();
  const [airline, setAirline] = useState<AirlineCode>('WIZZ');
  const [model, setModel] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [newComp, setNewComp] = useState({ name: '', holdsCsv: '' });

  const models = AIRCRAFT_MODELS[airline] || [];
  useEffect(() => {
    if (models.length && !models.some(m => m.model === model)) setModel(models[0].model);
  }, [airline, models, model]);

  const compartments: CompartmentDefinition[] = React.useMemo(
    () => getCompartmentsByAirline(airline, model || undefined),
    [airline, model, catalog.compartments, catalog.holds]
  );

  const upsertCompartment = async (id: string, base: CompartmentDefinition, patch: { name?: string; active?: boolean }) => {
    setSaving(true);
    const existing = catalog.compartments.find(c => c.id === id);
    const { error } = await supabase.from('catalog_compartments').upsert({
      id, airline_code: airline, aircraft_model_code: model || null,
      name: patch.name ?? existing?.name ?? base.compartmentName,
      hold_style: existing?.holdStyle ?? base.holdStyle ?? 'default',
      bulk: existing?.bulk ?? !!base.bulk,
      expandable: existing?.expandable ?? !!base.expandable,
      expandable_default: existing?.expandableDefault ?? base.expandableDefault ?? null,
      sort_order: existing?.sortOrder ?? 0,
      active: patch.active ?? existing?.active ?? true,
    }, { onConflict: 'id' });
    setSaving(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else await refreshCatalog();
  };

  const deleteCompartment = async (c: CompartmentDefinition) => {
    if (!confirm(`¿Eliminar compartimiento "${c.compartmentName}"? Las bodegas asociadas también se borrarán.`)) return;
    setSaving(true);
    // delete holds first, then compartment override row (if any)
    await supabase.from('catalog_holds').delete().eq('compartment_id', c.id);
    const existing = catalog.compartments.find(cc => cc.id === c.id);
    if (existing) {
      await supabase.from('catalog_compartments').delete().eq('id', c.id);
    } else {
      // hardcoded → soft-delete via inactive override
      await supabase.from('catalog_compartments').upsert({
        id: c.id, airline_code: airline, aircraft_model_code: model || null,
        name: c.compartmentName, hold_style: c.holdStyle ?? 'default',
        bulk: !!c.bulk, expandable: !!c.expandable, expandable_default: c.expandableDefault ?? null,
        sort_order: 0, active: false,
      }, { onConflict: 'id' });
    }
    setSaving(false);
    await refreshCatalog();
  };

  const upsertHold = async (holdId: string, compartmentId: string, baseLabel: string, patch: { label?: string; active?: boolean }) => {
    setSaving(true);
    const existing = catalog.holds.find(h => h.id === holdId);
    const { error } = await supabase.from('catalog_holds').upsert({
      id: holdId, compartment_id: compartmentId,
      label: patch.label ?? existing?.label ?? baseLabel,
      pair_group: existing?.pairGroup ?? null, pair_side: existing?.pairSide ?? null,
      sort_order: existing?.sortOrder ?? 0,
      active: patch.active ?? existing?.active ?? true,
    }, { onConflict: 'id' });
    setSaving(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else await refreshCatalog();
  };

  const deleteHold = async (holdId: string, compartmentId: string, baseLabel: string) => {
    if (!confirm(`¿Eliminar bodega "${baseLabel}"?`)) return;
    setSaving(true);
    const existing = catalog.holds.find(h => h.id === holdId);
    if (existing) {
      await supabase.from('catalog_holds').delete().eq('id', holdId);
    } else {
      // hardcoded → soft-delete
      await supabase.from('catalog_holds').upsert({
        id: holdId, compartment_id: compartmentId, label: baseLabel,
        pair_group: null, pair_side: null, sort_order: 0, active: false,
      }, { onConflict: 'id' });
    }
    setSaving(false);
    await refreshCatalog();
  };

  const addCompartment = async () => {
    if (!newComp.name.trim()) return toast({ title: 'Falta nombre', variant: 'destructive' });
    const slug = `${airline.toLowerCase()}-${(model || 'any').toLowerCase()}-${Date.now()}`;
    setSaving(true);
    const { error: cErr } = await supabase.from('catalog_compartments').insert({
      id: slug, airline_code: airline, aircraft_model_code: model || null,
      name: newComp.name.trim(), hold_style: 'default', bulk: false, expandable: false,
      sort_order: 1000, active: true,
    });
    if (cErr) { setSaving(false); return toast({ title: 'Error', description: cErr.message, variant: 'destructive' }); }
    const labels = newComp.holdsCsv.split(',').map(s => s.trim()).filter(Boolean);
    if (labels.length) {
      const rows = labels.map((label, i) => ({
        id: `${slug}-h${i + 1}`, compartment_id: slug, label,
        pair_group: null, pair_side: null, sort_order: i, active: true,
      }));
      const { error: hErr } = await supabase.from('catalog_holds').insert(rows);
      if (hErr) { setSaving(false); return toast({ title: 'Error', description: hErr.message, variant: 'destructive' }); }
    }
    setSaving(false);
    setNewComp({ name: '', holdsCsv: '' });
    await refreshCatalog();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compartimientos y bodegas</CardTitle>
        <div className="mt-2 flex gap-3 flex-wrap">
          <div>
            <Label>Aerolínea</Label>
            <Select value={airline} onValueChange={v => setAirline(v as AirlineCode)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{getAllAirlines().map(a => <SelectItem key={a.code} value={a.code}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Modelo</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Modelo" /></SelectTrigger>
              <SelectContent>{models.map(m => <SelectItem key={m.model} value={m.model}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {compartments.map(c => {
          const compOv = catalog.compartments.find(o => o.id === c.id);
          return (
            <div key={c.id} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  defaultValue={c.compartmentName}
                  key={`comp-${c.id}-${compOv?.name ?? ''}`}
                  className="font-semibold"
                  onBlur={e => { if (e.target.value !== c.compartmentName) upsertCompartment(c.id, c, { name: e.target.value }); }}
                />
                <div className="flex items-center gap-1 text-xs">
                  <span>Activo</span>
                  <Switch checked={compOv?.active ?? true} onCheckedChange={v => upsertCompartment(c.id, c, { active: v })} />
                </div>
                <Button size="sm" variant="destructive" disabled={saving} onClick={() => deleteCompartment(c)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {c.holds.map(h => {
                  if (isPairedHold(h)) {
                    return (
                      <React.Fragment key={`${h.left.id}-${h.right.id}`}>
                        <HoldEditor id={h.left.id} compartmentId={c.id} label={h.left.label} catalog={catalog} onSave={(p) => upsertHold(h.left.id, c.id, h.left.label, p)} onDelete={() => deleteHold(h.left.id, c.id, h.left.label)} saving={saving} />
                        <HoldEditor id={h.right.id} compartmentId={c.id} label={h.right.label} catalog={catalog} onSave={(p) => upsertHold(h.right.id, c.id, h.right.label, p)} onDelete={() => deleteHold(h.right.id, c.id, h.right.label)} saving={saving} />
                      </React.Fragment>
                    );
                  }
                  return (
                    <HoldEditor key={h.id} id={h.id} compartmentId={c.id} label={h.label} catalog={catalog} onSave={(p) => upsertHold(h.id, c.id, h.label, p)} onDelete={() => deleteHold(h.id, c.id, h.label)} saving={saving} />
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Añadir nuevo compartimiento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
            <div><Label>Nombre</Label><Input value={newComp.name} onChange={e => setNewComp(p => ({ ...p, name: e.target.value }))} placeholder="COMPARTIMIENTO 6" /></div>
            <div><Label>Bodegas (separadas por coma)</Label><Input value={newComp.holdsCsv} onChange={e => setNewComp(p => ({ ...p, holdsCsv: e.target.value }))} placeholder="Bodega 61, Bodega 62" /></div>
            <Button onClick={addCompartment} disabled={saving}><Plus className="h-4 w-4 mr-1" /> Añadir</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const HoldEditor: React.FC<{
  id: string;
  compartmentId: string;
  label: string;
  catalog: ReturnType<typeof useCatalog>;
  onSave: (patch: { label?: string; active?: boolean }) => void;
  onDelete: () => void;
  saving: boolean;
}> = ({ id, label, catalog, onSave, onDelete, saving }) => {
  const ov = catalog.holds.find(h => h.id === id);
  return (
    <div className="flex items-center gap-2">
      <Input
        defaultValue={label}
        key={`hold-${id}-${ov?.label ?? ''}`}
        onBlur={e => { if (e.target.value !== label) onSave({ label: e.target.value }); }}
      />
      <Switch checked={ov?.active ?? true} onCheckedChange={v => onSave({ active: v })} />
      <Button size="sm" variant="destructive" disabled={saving} onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
};

// ============================================================
// TIME FIELDS TAB
// ============================================================
// Default user-facing labels mirroring src/types/turnaround.ts TimeFieldConfig defaults.
// Used to show the admin the same text the operator sees in the form.
const TIME_FIELD_DEFAULT_LABELS: Record<string, string> = {
  chocksOnArrival: 'Calzos Llegada',
  chocksOff: 'Calzos Salida',
  stairsTime: 'Puesta Escalera',
  specialEndLoading: 'Retirada Escalera',
  unloadingStart: 'Inicio Descarga',
  unloadingEnd: 'Fin Descarga',
  loadingStart: 'Inicio Carga',
  loadingEnd: 'Fin Carga',
  firstBag: '1ª Maleta',
  lastHandBag: 'Cierre Coordinador',
  lirReception: 'Recepción de LIR',
  dock1: '1ª Muelle',
  cargoArrival: 'Cargo Llegada',
  cargoDeparture: 'Cargo Salida',
  mailArrival: 'Correo Llegada',
  mailDeparture: 'Correo Salida',
  aviArrival: 'AVI Llegada',
  aviDeparture: 'AVI Salida',
  asu: 'ASU',
  bagSearchStart: 'Inicio Búsqueda Maleta',
  bagSearchEnd: 'Fin Búsqueda Maleta',
  gpuOn: 'Puesta de GPU',
  gpuOff: 'Retirada de GPU',
  busArrival: '1ª Jardinera',
  parkingArrival: 'Llegada a Parking',
  fedexSuperArrival: 'Llegada FedEx Súper',
};

const TIME_FIELD_KEYS = Object.keys(TIME_FIELD_DEFAULT_LABELS);

const TimeFieldsTab: React.FC = () => {
  const catalog = useCatalog();
  const [airline, setAirline] = useState<AirlineCode>('WIZZ');
  const [saving, setSaving] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { label?: string }>>({});

  const ovs = catalog.timeFieldOverrides.filter(t => t.airlineCode === airline);

  // Default-used keys for this airline (union of local + remote variants),
  // so the Visible toggle reflects what the airline actually shows today.
  const defaultUsedKeys = React.useMemo(() => {
    const set = new Set<string>();
    try {
      getTimeFieldsForAirline(airline, false).forEach(f => set.add(f.key as string));
      getTimeFieldsForAirline(airline, true).forEach(f => set.add(f.key as string));
    } catch { /* unknown airline → empty set */ }
    return set;
  }, [airline]);

  // Reset local edits when airline changes
  useEffect(() => { setEdits({}); }, [airline]);

  const upsert = async (fieldKey: string, patch: any) => {
    const existing = ovs.find(o => o.fieldKey === fieldKey);
    setSaving(fieldKey);
    const payload = {
      airline_code: airline, field_key: fieldKey,
      visible: patch.visible ?? existing?.visible ?? true,
      label: patch.label !== undefined ? patch.label : (existing?.label ?? null),
      clock_color: patch.clockColor ?? existing?.clockColor ?? null,
      type: patch.type ?? existing?.type ?? null,
      sort_order: patch.sortOrder ?? existing?.sortOrder ?? null,
    };
    const { error } = await supabase.from('catalog_time_field_overrides').upsert(payload, { onConflict: 'airline_code,field_key' });
    setSaving(null);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setEdits(p => { const n = { ...p }; delete n[fieldKey]; return n; }); await refreshCatalog(); }
  };

  const clear = async (fieldKey: string) => {
    const existing = ovs.find(o => o.fieldKey === fieldKey);
    if (!existing) return;
    if (!confirm(`¿Restaurar "${fieldKey}" al valor por defecto?`)) return;
    setSaving(fieldKey);
    const { error } = await supabase.from('catalog_time_field_overrides').delete().eq('id', existing.id);
    setSaving(null);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setEdits(p => { const n = { ...p }; delete n[fieldKey]; return n; }); await refreshCatalog(); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campos de control de horas</CardTitle>
        <p className="text-xs text-muted-foreground">Sobrescribe etiqueta, visibilidad y color por aerolínea. Eliminar restaura el valor por defecto del código.</p>
        <div className="mt-2">
          <Select value={airline} onValueChange={v => setAirline(v as AirlineCode)}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>{getAllAirlines().map(a => <SelectItem key={a.code} value={a.code}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campo</TableHead>
              <TableHead>Etiqueta visible al usuario</TableHead>
              <TableHead>Visible</TableHead>
              <TableHead>Etiqueta personalizada</TableHead>
              <TableHead>Color reloj</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TIME_FIELD_KEYS.map(k => {
              const ov = ovs.find(o => o.fieldKey === k);
              const defaultLabel = TIME_FIELD_DEFAULT_LABELS[k] ?? k;
              const visibleLabel = ov?.label || defaultLabel;
              const currentLabel = edits[k]?.label ?? ov?.label ?? '';
              const dirty = edits[k]?.label !== undefined && edits[k]?.label !== (ov?.label ?? '');
              return (
                <TableRow key={k}>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">{k}</TableCell>
                  <TableCell className="font-semibold">
                    {visibleLabel}
                    {ov?.label && <span className="ml-1 text-[10px] text-primary">(personalizada)</span>}
                  </TableCell>
                  <TableCell><Switch checked={ov?.visible ?? true} onCheckedChange={v => upsert(k, { visible: v })} /></TableCell>
                  <TableCell>
                    <Input
                      value={currentLabel}
                      placeholder={defaultLabel}
                      onChange={e => setEdits(p => ({ ...p, [k]: { label: e.target.value } }))}
                      onBlur={() => { if (dirty) upsert(k, { label: currentLabel || null }); }}
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={ov?.clockColor ?? 'default'} onValueChange={v => upsert(k, { clockColor: v === 'default' ? null : v })}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Por defecto</SelectItem>
                        <SelectItem value="green">Verde</SelectItem>
                        <SelectItem value="red">Rojo</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" disabled={!ov || saving === k} onClick={() => clear(k)} title="Restaurar al valor por defecto">
                      {saving === k ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CatalogManager;
