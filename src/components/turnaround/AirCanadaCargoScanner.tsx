import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Camera, RotateCcw, Loader2, AlertCircle, ChevronDown, Plane } from 'lucide-react';
import { compressImage } from '@/utils/imageCompressor';
import { groupPositionsForDisplay } from '@/utils/acCargoLayout';
import { cn } from '@/lib/utils';

const SUPPORTED_TYPES = ['A333', 'B777', '787-800', '787-900', 'B787-800', 'B787-900'];

interface AirCanadaCargoScannerProps {
  flightNumber: string;
  flightDate: string; // YYYY-MM-DD
  aircraftType: string;
  turnaroundId?: string;
}

interface PositionData {
  id?: string;
  position: string;
  section: 'FWD' | 'AFT';
  containerId: string;
  weightKg: string;
  pieces: string;
  percentage: string;
  notes: string;
  isDoorPosition: boolean;
  manualOrder: string;
}

interface BulkData {
  bf: number;
  by_val: number;
  dom: number;
  usa: number;
  int_val: number;
  bg: number;
  rush: number;
}

const EMPTY_BULK: BulkData = { bf: 0, by_val: 0, dom: 0, usa: 0, int_val: 0, bg: 0, rush: 0 };

interface ScanModuleState {
  fwdPositions: PositionData[];
  aftPositions: PositionData[];
  fwdScanned: boolean;
  aftScanned: boolean;
  bulk: BulkData;
  isScanningFwd: boolean;
  isScanningAft: boolean;
  scanError: string | null;
}

const emptyModule = (): ScanModuleState => ({
  fwdPositions: [],
  aftPositions: [],
  fwdScanned: false,
  aftScanned: false,
  bulk: { ...EMPTY_BULK },
  isScanningFwd: false,
  isScanningAft: false,
  scanError: null,
});

// simple debounce keyed by row+field
function useDebouncedSave() {
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  return useCallback((rowId: string, field: string, value: unknown) => {
    const key = `${rowId}:${field}`;
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      await supabase
        .from('ac_load_sheet_data')
        .update({ [field]: value as any, updated_at: new Date().toISOString() })
        .eq('id', rowId);
    }, 800);
  }, []);
}

const AirCanadaCargoScanner: React.FC<AirCanadaCargoScannerProps> = ({
  flightNumber,
  flightDate,
  aircraftType,
  turnaroundId,
}) => {
  const [arrival, setArrival] = useState<ScanModuleState>(emptyModule());
  const [departure, setDeparture] = useState<ScanModuleState>(emptyModule());
  const [openModule, setOpenModule] = useState<'arrival' | 'departure' | null>('arrival');
  const [lirDialog, setLirDialog] = useState<{
    open: boolean;
    title: string;
    body: string;
  }>({ open: false, title: '', body: '' });

  const fwdArrivalRef = useRef<HTMLInputElement>(null);
  const aftArrivalRef = useRef<HTMLInputElement>(null);
  const fwdDepartureRef = useRef<HTMLInputElement>(null);
  const aftDepartureRef = useRef<HTMLInputElement>(null);

  const debouncedSave = useDebouncedSave();

  // Load existing data
  useEffect(() => {
    if (!flightNumber || !flightDate) return;
    let cancelled = false;

    (async () => {
      const [{ data: positions }, { data: bulkRows }] = await Promise.all([
        supabase
          .from('ac_load_sheet_data')
          .select('*')
          .eq('flight_number', flightNumber)
          .eq('flight_date', flightDate),
        supabase
          .from('ac_bulk_data')
          .select('*')
          .eq('flight_number', flightNumber)
          .eq('flight_date', flightDate),
      ]);

      if (cancelled) return;

      const mapPos = (rows: any[]): PositionData[] =>
        rows.map((r) => ({
          id: r.id,
          position: r.position,
          section: r.fwd_section,
          containerId: r.container_id ?? '',
          weightKg: r.weight_kg != null ? String(r.weight_kg) : '',
          pieces: r.pieces != null ? String(r.pieces) : '',
          percentage: r.percentage != null ? String(r.percentage) : '',
          notes: r.notes ?? '',
          isDoorPosition: r.is_door_position ?? false,
          manualOrder: r.manual_order != null ? String(r.manual_order) : '',
        }));

      const pos = positions ?? [];
      const arrFwd = pos.filter((p: any) => p.scan_type === 'arrival' && p.fwd_section === 'FWD');
      const arrAft = pos.filter((p: any) => p.scan_type === 'arrival' && p.fwd_section === 'AFT');
      const depFwd = pos.filter((p: any) => p.scan_type === 'departure' && p.fwd_section === 'FWD');
      const depAft = pos.filter((p: any) => p.scan_type === 'departure' && p.fwd_section === 'AFT');

      const arrBulk = bulkRows?.find((b: any) => b.scan_type === 'arrival');
      const depBulk = bulkRows?.find((b: any) => b.scan_type === 'departure');

      const readBulk = (r: any): BulkData =>
        r
          ? {
              bf: r.bf ?? 0,
              by_val: r.by_val ?? 0,
              dom: r.dom ?? 0,
              usa: r.usa ?? 0,
              int_val: r.int_val ?? 0,
              bg: r.bg ?? 0,
              rush: r.rush ?? 0,
            }
          : { ...EMPTY_BULK };

      setArrival((prev) => ({
        ...prev,
        fwdPositions: mapPos(arrFwd),
        aftPositions: mapPos(arrAft),
        fwdScanned: arrFwd.length > 0,
        aftScanned: arrAft.length > 0,
        bulk: readBulk(arrBulk),
      }));
      setDeparture((prev) => ({
        ...prev,
        fwdPositions: mapPos(depFwd),
        aftPositions: mapPos(depAft),
        fwdScanned: depFwd.length > 0,
        aftScanned: depAft.length > 0,
        bulk: readBulk(depBulk),
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [flightNumber, flightDate]);

  if (!SUPPORTED_TYPES.includes(aircraftType)) return null;

  const handleScan = async (
    file: File,
    scanType: 'arrival' | 'departure',
    expectedSection: 'FWD' | 'AFT',
  ) => {
    const setter = scanType === 'arrival' ? setArrival : setDeparture;
    const scanningKey = expectedSection === 'FWD' ? 'isScanningFwd' : 'isScanningAft';

    setter((prev) => ({ ...prev, [scanningKey]: true, scanError: null }));

    try {
      const compressed = await compressImage(file);
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(compressed);
      });

      const { data, error } = await supabase.functions.invoke('scan-load-sheet', {
        body: { imageBase64: base64, mimeType: compressed.type, expectedSection },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const mapped: PositionData[] = ((data as any).positions ?? [])
        .filter((p: any) => p.containerId)
        .map((p: any) => ({
          position: p.position,
          section: expectedSection,
          containerId: p.containerId ?? '',
          weightKg: String(p.weightKg ?? ''),
          pieces: String(p.pieces ?? ''),
          percentage: String(p.percentage ?? ''),
          notes: p.notes ?? '',
          isDoorPosition: p.isDoorPosition ?? false,
          manualOrder: '',
        }));

      // Replace this section in DB
      await supabase
        .from('ac_load_sheet_data')
        .delete()
        .eq('flight_number', flightNumber)
        .eq('flight_date', flightDate)
        .eq('scan_type', scanType)
        .eq('fwd_section', expectedSection);

      let inserted: any[] = [];
      if (mapped.length > 0) {
        const { data: ins } = await supabase
          .from('ac_load_sheet_data')
          .insert(
            mapped.map((p) => ({
              turnaround_id: turnaroundId ?? null,
              flight_number: flightNumber,
              flight_date: flightDate,
              aircraft_type: aircraftType,
              scan_type: scanType,
              fwd_section: expectedSection,
              position: p.position,
              container_id: p.containerId || null,
              weight_kg: parseFloat(p.weightKg) || null,
              pieces: parseInt(p.pieces) || null,
              percentage: parseInt(p.percentage) || null,
              notes: p.notes || null,
              is_door_position: p.isDoorPosition,
              manual_order: null,
            })),
          )
          .select();
        inserted = ins ?? [];
      }

      // Merge ids back
      const withIds = mapped.map((p, i) => ({ ...p, id: inserted[i]?.id }));

      setter((prev) => ({
        ...prev,
        [expectedSection === 'FWD' ? 'fwdPositions' : 'aftPositions']: withIds,
        [expectedSection === 'FWD' ? 'fwdScanned' : 'aftScanned']: true,
        [scanningKey]: false,
      }));
    } catch (err) {
      console.error(err);
      setter((prev) => ({
        ...prev,
        [scanningKey]: false,
        scanError: 'Error al escanear. Verifica la imagen e inténtalo de nuevo.',
      }));
    }
  };

  const dbFieldMap: Record<string, string> = {
    containerId: 'container_id',
    weightKg: 'weight_kg',
    pieces: 'pieces',
    percentage: 'percentage',
    notes: 'notes',
    manualOrder: 'manual_order',
  };
  const numericFields = new Set(['weightKg', 'pieces', 'percentage', 'manualOrder']);

  const updatePosition = (
    scanType: 'arrival' | 'departure',
    position: string,
    field: keyof PositionData,
    value: string,
  ) => {
    const setter = scanType === 'arrival' ? setArrival : setDeparture;
    setter((prev) => {
      const updateList = (list: PositionData[]) =>
        list.map((p) => {
          if (p.position !== position) return p;
          const updated = { ...p, [field]: value };
          if (updated.id && dbFieldMap[field as string]) {
            const dbKey = dbFieldMap[field as string];
            const dbValue = numericFields.has(field as string)
              ? value === ''
                ? null
                : parseFloat(value)
              : value || null;
            debouncedSave(updated.id, dbKey, dbValue);
          }
          return updated;
        });
      return {
        ...prev,
        fwdPositions: updateList(prev.fwdPositions),
        aftPositions: updateList(prev.aftPositions),
      };
    });
  };

  const updateBulk = async (
    scanType: 'arrival' | 'departure',
    field: keyof BulkData,
    delta: number,
  ) => {
    const setter = scanType === 'arrival' ? setArrival : setDeparture;
    const current = scanType === 'arrival' ? arrival.bulk : departure.bulk;
    const newVal = Math.max(0, (current[field] ?? 0) + delta);
    const newBulk = { ...current, [field]: newVal };

    setter((prev) => ({ ...prev, bulk: newBulk }));

    await supabase.from('ac_bulk_data').upsert(
      {
        turnaround_id: turnaroundId ?? null,
        flight_number: flightNumber,
        flight_date: flightDate,
        scan_type: scanType,
        ...newBulk,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'flight_number,flight_date,scan_type' },
    );
  };

  const resetModule = async (scanType: 'arrival' | 'departure') => {
    await supabase
      .from('ac_load_sheet_data')
      .delete()
      .eq('flight_number', flightNumber)
      .eq('flight_date', flightDate)
      .eq('scan_type', scanType);
    await supabase
      .from('ac_bulk_data')
      .delete()
      .eq('flight_number', flightNumber)
      .eq('flight_date', flightDate)
      .eq('scan_type', scanType);
    (scanType === 'arrival' ? setArrival : setDeparture)(emptyModule());
  };

  const openLir = (scanType: 'arrival' | 'departure', section: 'FWD' | 'AFT') => {
    const state = scanType === 'arrival' ? arrival : departure;
    const positions = section === 'FWD' ? state.fwdPositions : state.aftPositions;
    const body = positions
      .map(
        (p) =>
          `${p.position.padEnd(4)} ${(p.containerId || '').padEnd(12)} ${(p.weightKg || '0').padStart(5)}kg  ${(p.pieces || '0').padStart(2)}#  ${(p.percentage || '0').padStart(3)}%  ${p.notes || ''}`,
      )
      .join('\n');
    setLirDialog({
      open: true,
      title: `LIR ${section} — ${scanType === 'arrival' ? 'Descarga' : 'Carga'}`,
      body: body || '(sin datos)',
    });
  };

  // ------ Rendering pieces ------

  const PositionCell: React.FC<{ posKey: string; scanType: 'arrival' | 'departure' }> = ({
    posKey,
    scanType,
  }) => {
    const state = scanType === 'arrival' ? arrival : departure;
    const pos =
      state.fwdPositions.find((p) => p.position === posKey) ||
      state.aftPositions.find((p) => p.position === posKey);
    if (!pos) {
      return (
        <div className="flex-1 border border-dashed border-muted rounded-md p-2 text-center text-xs text-muted-foreground">
          —
        </div>
      );
    }
    return (
      <div className="flex-1 border border-border rounded-md p-2 space-y-1.5 bg-card">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={pos.manualOrder}
            onChange={(e) => updatePosition(scanType, pos.position, 'manualOrder', e.target.value)}
            placeholder="–"
            className="w-8 h-6 text-center text-xs font-bold text-red-500 border border-red-500 rounded bg-transparent focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <span className="text-xs font-mono font-bold text-foreground">{posKey}</span>
          {pos.isDoorPosition && (
            <span className="px-1.5 py-0.5 rounded bg-black text-white text-[9px] font-bold tracking-wider">
              PUERTA
            </span>
          )}
          <input
            type="text"
            value={pos.containerId}
            onChange={(e) =>
              updatePosition(scanType, pos.position, 'containerId', e.target.value.toUpperCase())
            }
            placeholder="ID contenedor"
            className="flex-1 h-6 font-mono text-xs px-1.5 border border-input rounded bg-background"
          />
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <input
            type="number"
            value={pos.weightKg}
            onChange={(e) => updatePosition(scanType, pos.position, 'weightKg', e.target.value)}
            placeholder="0"
            className="w-14 h-6 text-xs border border-input rounded px-1 bg-background text-right"
          />
          <span className="text-muted-foreground">kg</span>
          <input
            type="number"
            value={pos.pieces}
            onChange={(e) => updatePosition(scanType, pos.position, 'pieces', e.target.value)}
            placeholder="0"
            className="w-10 h-6 text-xs border border-input rounded px-1 bg-background text-right"
          />
          <span className="text-muted-foreground">#</span>
          <input
            type="number"
            value={pos.percentage}
            onChange={(e) => updatePosition(scanType, pos.position, 'percentage', e.target.value)}
            placeholder="100"
            className="w-12 h-6 text-xs border border-input rounded px-1 bg-background text-right"
          />
          <span className="text-muted-foreground">%</span>
        </div>

        <input
          type="text"
          value={pos.notes}
          onChange={(e) => updatePosition(scanType, pos.position, 'notes', e.target.value)}
          placeholder="Notas..."
          className="w-full h-6 text-[11px] text-muted-foreground border border-input rounded px-1.5 bg-background"
        />
      </div>
    );
  };

  const PositionGrid: React.FC<{ scanType: 'arrival' | 'departure' }> = ({ scanType }) => {
    const state = scanType === 'arrival' ? arrival : departure;
    const all = [...state.fwdPositions, ...state.aftPositions];
    if (all.length === 0) return null;

    const displayRows = groupPositionsForDisplay(
      all.map((p) => ({ section: p.section, position: p.position, isDoorPosition: p.isDoorPosition })),
    );

    let lastSection = '';
    return (
      <div className="space-y-2">
        {displayRows.map((row) => {
          const showHeader = row.section !== lastSection;
          lastSection = row.section;
          return (
            <React.Fragment key={`${row.section}-${row.rowKey}`}>
              {showHeader && (
                <div className="pt-2 pb-1 flex items-center gap-2">
                  <span className="text-xs font-bold tracking-wider text-muted-foreground">
                    {row.section}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              {row.single !== undefined ? (
                <PositionCell posKey={row.single} scanType={scanType} />
              ) : (
                <div className="flex items-stretch gap-2">
                  {row.left ? (
                    <PositionCell posKey={row.left} scanType={scanType} />
                  ) : (
                    <div className="flex-1" />
                  )}
                  <div className="w-px bg-border" />
                  {row.right ? (
                    <PositionCell posKey={row.right} scanType={scanType} />
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const BulkSection: React.FC<{ scanType: 'arrival' | 'departure' }> = ({ scanType }) => {
    const bulk = scanType === 'arrival' ? arrival.bulk : departure.bulk;
    const Counter = ({ field, label }: { field: keyof BulkData; label: string }) => (
      <div className="flex flex-col items-center gap-1 border border-border rounded-md p-2 bg-card">
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => updateBulk(scanType, field, -1)}
            className="w-6 h-6 rounded bg-muted text-foreground font-bold hover:bg-muted/70"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-mono font-bold text-foreground">
            {bulk[field]}
          </span>
          <button
            type="button"
            onClick={() => updateBulk(scanType, field, +1)}
            className="w-6 h-6 rounded bg-primary text-primary-foreground font-bold hover:bg-primary/80"
          >
            +
          </button>
        </div>
      </div>
    );
    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wider text-muted-foreground">BULK</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Counter field="bf" label="BF" />
          <Counter field="by_val" label="BY" />
          <Counter field="dom" label="DOM" />
          <Counter field="usa" label="USA" />
          <Counter field="int_val" label="INT" />
          <Counter field="bg" label="BG" />
          <div className="col-span-3 flex justify-center">
            <div className="w-1/3">
              <Counter field="rush" label="RUSH" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ScanModule: React.FC<{ scanType: 'arrival' | 'departure' }> = ({ scanType }) => {
    const state = scanType === 'arrival' ? arrival : departure;
    const fwdRef = scanType === 'arrival' ? fwdArrivalRef : fwdDepartureRef;
    const aftRef = scanType === 'arrival' ? aftArrivalRef : aftDepartureRef;
    const hasAny = state.fwdScanned || state.aftScanned;

    return (
      <div className="p-3 border border-border rounded-b-md bg-background/40 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* FWD */}
          <input
            ref={fwdRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleScan(f, scanType, 'FWD');
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fwdRef.current?.click()}
            disabled={state.isScanningFwd}
            className="gap-1.5 text-xs h-7"
          >
            {state.isScanningFwd ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Escaneando FWD...
              </>
            ) : (
              <>
                <Camera className="h-3.5 w-3.5" /> {state.fwdScanned ? '↺ Re-escanear FWD' : 'Escanear FWD'}
              </>
            )}
          </Button>
          {state.fwdScanned && (
            <span className="text-[10px] font-bold text-emerald-600">✓ FWD</span>
          )}

          {/* AFT */}
          <input
            ref={aftRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleScan(f, scanType, 'AFT');
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => aftRef.current?.click()}
            disabled={state.isScanningAft}
            className="gap-1.5 text-xs h-7"
          >
            {state.isScanningAft ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Escaneando AFT...
              </>
            ) : (
              <>
                <Camera className="h-3.5 w-3.5" /> {state.aftScanned ? '↺ Re-escanear AFT' : 'Escanear AFT'}
              </>
            )}
          </Button>
          {state.aftScanned && (
            <span className="text-[10px] font-bold text-emerald-600">✓ AFT</span>
          )}

          {state.fwdScanned && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => openLir(scanType, 'FWD')}
              className="text-xs h-7"
            >
              LIR FWD
            </Button>
          )}
          {state.aftScanned && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => openLir(scanType, 'AFT')}
              className="text-xs h-7"
            >
              LIR AFT
            </Button>
          )}

          {hasAny && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => resetModule(scanType)}
              className="gap-1.5 text-xs h-7 text-red-500 hover:text-red-700 ml-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>

        {state.scanError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {state.scanError}
            </div>
          </div>
        )}

        {!hasAny && !state.isScanningFwd && !state.isScanningAft && (
          <div className="rounded-md border border-dashed border-muted p-6 text-center">
            <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Escanea la hoja FWD y la hoja AFT</p>
            <p className="text-xs text-muted-foreground/70">Puedes escanear una o las dos</p>
          </div>
        )}

        {hasAny && <PositionGrid scanType={scanType} />}

        <BulkSection scanType={scanType} />
      </div>
    );
  };

  const ModuleHeader = ({
    scanType,
    label,
    color,
  }: {
    scanType: 'arrival' | 'departure';
    label: string;
    color: string;
  }) => {
    const state = scanType === 'arrival' ? arrival : departure;
    const active = openModule === scanType;
    const scanned = [state.fwdScanned && 'FWD', state.aftScanned && 'AFT']
      .filter(Boolean)
      .join(' + ');
    return (
      <button
        type="button"
        onClick={() => setOpenModule(active ? null : scanType)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-t-md border border-b-0 border-border transition-colors',
          active ? color : 'bg-muted/40',
        )}
      >
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4" />
          <span className="text-sm font-bold">{label}</span>
          {scanned && (
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              {scanned} escaneado
            </span>
          )}
        </div>
        <ChevronDown className={cn('h-4 w-4 transition-transform', active && 'rotate-180')} />
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <ModuleHeader
          scanType="arrival"
          label="✈️ Descarga — Llegada"
          color="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        />
        {openModule === 'arrival' && <ScanModule scanType="arrival" />}
      </div>

      <div>
        <ModuleHeader
          scanType="departure"
          label="✈️ Carga — Salida"
          color="bg-rose-500/15 text-rose-700 dark:text-rose-400"
        />
        {openModule === 'departure' && <ScanModule scanType="departure" />}
      </div>

      <Dialog open={lirDialog.open} onOpenChange={(o) => setLirDialog((p) => ({ ...p, open: o }))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{lirDialog.title}</DialogTitle>
          </DialogHeader>
          <pre className="text-xs font-mono whitespace-pre overflow-auto max-h-[60vh] p-3 bg-muted rounded">
            {lirDialog.body}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AirCanadaCargoScanner;
