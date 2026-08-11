import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, ClipboardList, Loader2, Search, Wrench, X, Flag, ListChecks,
} from 'lucide-react';
import { useEquipment, updateParking, updateBattery, toggleBroken } from '@/hooks/useEquipment';
import { useEquipmentReview } from '@/hooks/useEquipmentReview';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { EquipmentUnitFull } from '@/types/equipment';
import { matchEquipment } from '@/utils/equipmentSearch';

const EquiposRevision = () => {
  const navigate = useNavigate();
  const { loading: loadingEquipment, fullCategories } = useEquipment();
  const {
    loading: loadingReview, session, checks,
    startReview, markChecked, unmarkChecked, finishReview,
  } = useEquipmentReview();

  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  const [confirmStart, setConfirmStart] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [starting, setStarting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const loading = loadingEquipment || loadingReview;

  /** Unidades reales (sin separadores) de las categorías incluidas. */
  const unitsInScope = useMemo(() => {
    const cats = session
      ? fullCategories.filter(c => session.category_ids.length === 0 || session.category_ids.includes(c.id))
      : [];
    return cats.flatMap(c => c.units
      .filter(u => !u.is_separator)
      .map(u => ({ ...u, categoryName: c.name, categoryId: c.id })));
  }, [fullCategories, session]);

  const reviewedCount = useMemo(
    () => unitsInScope.filter(u => checks[u.id]).length,
    [unitsInScope, checks],
  );
  const total = unitsInScope.length;
  const pct = total > 0 ? Math.round((reviewedCount / total) * 100) : 0;

  const missing = useMemo(
    () => unitsInScope.filter(u => !checks[u.id]),
    [unitsInScope, checks],
  );

  /** Coincidencias del buscador: prioriza las que terminan en lo tecleado. */
  const matches = useMemo(
    () => matchEquipment(unitsInScope, query),
    [query, unitsInScope],
  );

  // Con una única coincidencia se abre sola: es el caso normal al teclear los
  // 4 últimos números, y ahorra un toque por equipo.
  useEffect(() => {
    if (matches.length === 1) setActiveUnitId(matches[0].id);
    else if (matches.length === 0) setActiveUnitId(null);
  }, [matches]);

  const activeUnit = useMemo(
    () => unitsInScope.find(u => u.id === activeUnitId) ?? null,
    [unitsInScope, activeUnitId],
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setActiveUnitId(null);
    searchRef.current?.focus();
  }, []);

  const handleStart = async () => {
    setStarting(true);
    try {
      const cats = selectedCats.length === fullCategories.length ? [] : selectedCats;
      const unitIds = fullCategories
        .filter(c => selectedCats.includes(c.id))
        .flatMap(c => c.units.filter(u => !u.is_separator).map(u => u.id));
      await startReview(cats, unitIds);
      toast({ title: 'Revisión iniciada', description: `${unitIds.length} equipos por revisar.` });
      setTimeout(() => searchRef.current?.focus(), 100);
    } catch (err) {
      console.error(err);
      toast({
        title: 'No se pudo iniciar',
        description: 'Puede que otro compañero ya tenga una revisión abierta.',
        variant: 'destructive',
      });
    } finally {
      setStarting(false);
      setConfirmStart(false);
    }
  };

  /* ─────────────── Cargando ─────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ─────────────── Sin revisión abierta: elegir categorías ─────────────── */
  if (!session) {
    const selectedUnits = fullCategories
      .filter(c => selectedCats.includes(c.id))
      .reduce((n, c) => n + c.units.filter(u => !u.is_separator).length, 0);

    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-10 flex h-14 items-center border-b border-border bg-card px-3">
          <button onClick={() => navigate('/equipos')} className="flex h-10 w-10 items-center justify-center" aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <h1 className="flex-1 text-center font-mono text-base font-bold uppercase tracking-wide">Modo Revisión</h1>
          <ThemeToggle />
        </header>

        <div className="flex-1 p-4 space-y-4">
          <div className="card-operational p-4 space-y-1">
            <h2 className="flex items-center gap-2 font-semibold"><ClipboardList size={18} /> ¿Qué vas a revisar?</h2>
            <p className="text-sm text-muted-foreground">
              Elige las categorías. Al empezar se vaciarán el parking y la batería de esos
              equipos para registrarlos de cero — los averiados no se tocan.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedCats(fullCategories.map(c => c.id))}>
              Todas
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedCats([])}>
              Ninguna
            </Button>
          </div>

          <div className="space-y-2">
            {fullCategories.map((cat) => {
              const n = cat.units.filter(u => !u.is_separator).length;
              const on = selectedCats.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCats(prev =>
                    on ? prev.filter(id => id !== cat.id) : [...prev, cat.id])}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                    on ? 'border-primary bg-primary/10' : 'border-border bg-card',
                  )}
                >
                  <Checkbox checked={on} className="pointer-events-none" />
                  <span className="flex-1 font-mono text-sm font-bold uppercase">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">{n} equipos</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-border bg-card p-4">
          <Button
            className="w-full gap-2 h-12 text-base"
            disabled={selectedCats.length === 0}
            onClick={() => setConfirmStart(true)}
          >
            <Flag size={18} />
            Empezar revisión{selectedUnits > 0 ? ` (${selectedUnits} equipos)` : ''}
          </Button>
        </div>

        <AlertDialog open={confirmStart} onOpenChange={setConfirmStart}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Empezar la revisión?</AlertDialogTitle>
              <AlertDialogDescription>
                Se vaciarán el parking y la batería de los {selectedUnits} equipos seleccionados
                para que los registres de cero. Los equipos marcados como averiados
                conservan su estado. La revisión será visible para todos tus compañeros.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={starting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); handleStart(); }} disabled={starting}>
                {starting ? 'Iniciando…' : 'Sí, empezar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  /* ─────────────── Revisión en curso ─────────────── */
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="flex h-14 items-center px-3">
          <button onClick={() => navigate('/equipos')} className="flex h-10 w-10 items-center justify-center" aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <h1 className="flex-1 text-center font-mono text-base font-bold uppercase tracking-wide">Modo Revisión</h1>
          <ThemeToggle />
        </div>

        {/* Progreso */}
        <div className="px-3 pb-3 space-y-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-mono font-bold">
              {reviewedCount} / {total} <span className="font-normal text-muted-foreground">revisados</span>
            </span>
            <span className={cn('font-mono font-bold', pct === 100 ? 'text-success' : 'text-primary')}>{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full transition-all', pct === 100 ? 'bg-success' : 'bg-primary')}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </header>

      <div className="flex-1 p-3 space-y-3 pb-32">
        {/* Buscador */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            inputMode="numeric"
            placeholder="Últimos números del equipo · ej. 8501"
            className="h-14 pl-10 pr-10 text-lg font-mono"
          />
          {query && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Limpiar">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Varias coincidencias: elegir */}
        {matches.length > 1 && (
          <div className="space-y-1.5">
            {matches.map((u) => (
              <button
                key={u.id}
                onClick={() => setActiveUnitId(u.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border p-3 text-left',
                  activeUnitId === u.id ? 'border-primary bg-primary/10' : 'border-border bg-card',
                )}
              >
                <span className="font-mono font-bold">{u.code}</span>
                <span className="text-xs text-muted-foreground">{u.categoryName}</span>
                {checks[u.id] && <Check size={16} className="ml-auto text-success" />}
              </button>
            ))}
          </div>
        )}

        {/* Ficha del equipo */}
        {activeUnit && (
          <ReviewCard
            unit={activeUnit}
            categoryName={(activeUnit as any).categoryName}
            checked={!!checks[activeUnit.id]}
            checkedBy={checks[activeUnit.id]?.checked_by_name ?? null}
            onMark={(method) => markChecked(activeUnit.id, method)}
            onUnmark={() => unmarkChecked(activeUnit.id)}
            onDone={clearSearch}
          />
        )}

        {!activeUnit && query.length >= 2 && matches.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Ningún equipo coincide con «{query}» en las categorías de esta revisión.
          </p>
        )}

        {!query && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Escribe los últimos números del equipo que tengas delante.
          </p>
        )}
      </div>

      {/* Barra inferior */}
      <div className="fixed bottom-0 left-0 right-0 z-20 flex gap-2 border-t border-border bg-card p-3">
        <Button variant="outline" className="flex-1 gap-2 h-12" onClick={() => setShowMissing(true)}>
          <ListChecks size={18} />
          Faltantes ({missing.length})
        </Button>
        <Button
          variant={pct === 100 ? 'default' : 'secondary'}
          className="flex-1 gap-2 h-12"
          onClick={() => setConfirmFinish(true)}
        >
          <Flag size={18} /> Terminar
        </Button>
      </div>

      {/* Diálogo de faltantes */}
      <Dialog open={showMissing} onOpenChange={setShowMissing}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Equipos por revisar ({missing.length})</DialogTitle>
            <DialogDescription>
              Toca un equipo para abrirlo en el buscador.
            </DialogDescription>
          </DialogHeader>

          {missing.length === 0 ? (
            <p className="py-6 text-center text-sm font-semibold text-success">
              ¡Todos revisados! 🎉
            </p>
          ) : (
            <div className="space-y-4">
              {fullCategories
                .filter(c => missing.some(u => (u as any).categoryId === c.id))
                .map((cat) => {
                  const items = missing.filter(u => (u as any).categoryId === cat.id);
                  return (
                    <div key={cat.id} className="space-y-1.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {cat.name} — faltan {items.length}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setQuery(u.code);
                              setActiveUnitId(u.id);
                              setShowMissing(false);
                            }}
                            className={cn(
                              'flex items-center gap-1 rounded-md border px-2 py-1.5 font-mono text-xs',
                              u.state?.is_broken
                                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                                : 'border-border bg-card',
                            )}
                          >
                            {u.state?.is_broken && <Wrench size={12} />}
                            {u.code}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              <p className="pt-1 text-xs text-muted-foreground">
                <Wrench size={11} className="mb-0.5 mr-1 inline" />
                En rojo, los equipos marcados como averiados: puede que estén en taller y no los encuentres en pista.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Terminar */}
      <AlertDialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Terminar la revisión?</AlertDialogTitle>
            <AlertDialogDescription>
              {missing.length > 0
                ? `Quedan ${missing.length} equipos sin revisar. Si la cierras, se cerrará también para tus compañeros.`
                : 'Están todos los equipos revisados. Se cerrará la revisión para todos.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir revisando</AlertDialogCancel>
            <AlertDialogAction onClick={async (e) => {
              e.preventDefault();
              await finishReview();
              setConfirmFinish(false);
              toast({ title: 'Revisión cerrada', description: `${reviewedCount} de ${total} equipos revisados.` });
            }}>
              Terminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ───────────────────────── Ficha de equipo ───────────────────────── */

interface ReviewCardProps {
  unit: EquipmentUnitFull;
  categoryName: string;
  checked: boolean;
  checkedBy: string | null;
  onMark: (method: 'data' | 'confirmed') => void;
  onUnmark: () => void;
  onDone: () => void;
}

const ReviewCard = ({ unit, categoryName, checked, checkedBy, onMark, onUnmark, onDone }: ReviewCardProps) => {
  const state = unit.state;
  const [parking, setParking] = useState(state?.parking ?? '');
  const [battery, setBattery] = useState(state?.battery_level != null ? String(state.battery_level) : '');
  const isBroken = state?.is_broken ?? false;
  const isFuel = unit.fuel_type === 'fuel';

  // Al cambiar de equipo, la ficha se recarga con sus datos.
  useEffect(() => {
    setParking(unit.state?.parking ?? '');
    setBattery(unit.state?.battery_level != null ? String(unit.state.battery_level) : '');
  }, [unit.id]);

  const saveParking = (v: string) => {
    if (v === (state?.parking ?? '')) return;
    updateParking(unit.id, unit.code, unit.category_id, state?.parking ?? '', v, 'equipos');
    onMark('data');
  };
  const saveBattery = (v: string) => {
    const level = v === '' ? null : Math.max(0, Math.min(100, parseInt(v, 10) || 0));
    if (level === (state?.battery_level ?? null)) return;
    updateBattery(unit.id, unit.code, unit.category_id, state?.battery_level ?? null, level, 'equipos');
    onMark('data');
  };

  return (
    <div className={cn(
      'card-operational space-y-3 p-4',
      checked && 'ring-2 ring-success',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-2xl font-bold">{unit.code}</p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{categoryName}</p>
        </div>
        {checked ? (
          <button
            onClick={onUnmark}
            className="flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success"
            title="Tocar para desmarcar"
          >
            <Check size={14} /> Revisado
          </button>
        ) : (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            Sin revisar
          </span>
        )}
      </div>

      {checked && checkedBy && (
        <p className="text-xs text-muted-foreground">Revisado por {checkedBy}</p>
      )}

      {isBroken && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-xs font-semibold text-destructive">
          <Wrench size={14} /> Marcado como averiado / taller
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parking</label>
          <Input
            value={parking}
            onChange={(e) => setParking(e.target.value.toUpperCase().slice(0, 6))}
            onBlur={() => saveParking(parking)}
            placeholder="Ej: 45"
            className="h-12 font-mono text-lg"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isFuel ? 'Combustible' : 'Batería'} %
          </label>
          <Input
            value={battery}
            onChange={(e) => setBattery(e.target.value.replace(/\D/g, '').slice(0, 3))}
            onBlur={() => saveBattery(battery)}
            inputMode="numeric"
            placeholder="0-100"
            className="h-12 font-mono text-lg"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => { onMark('confirmed'); onDone(); }}
        >
          <Check size={16} /> Visto, sin cambios
        </Button>
        <Button
          variant={isBroken ? 'secondary' : 'outline'}
          size="icon"
          className={cn('h-10 w-10 shrink-0', isBroken && 'text-destructive')}
          onClick={() => {
            toggleBroken(unit.id, unit.code, unit.category_id, isBroken, 'equipos');
            onMark('data');
          }}
          title={isBroken ? 'Quitar avería' : 'Marcar como averiado'}
        >
          <Wrench size={16} />
        </Button>
      </div>

      <Button className="w-full h-11 gap-2" onClick={() => { saveParking(parking); saveBattery(battery); onDone(); }}>
        Guardar y siguiente
      </Button>
    </div>
  );
};

export default EquiposRevision;
