import React, { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, RotateCcw, Loader2, AlertCircle, Plane } from 'lucide-react';
import { compressImage } from '@/utils/imageCompressor';
import { groupPositionsForDisplay } from '@/utils/acCargoLayout';
import { cn } from '@/lib/utils';

const SUPPORTED_MODELS = ['A333', 'B777', '787-800', '787-900', 'B787-800', 'B787-900'];

interface AirCanadaCargoScannerProps {
  flightNumber: string;
  flightDate: string;
  aircraftType: string;
  turnaroundId?: string;
}

interface PositionData {
  position: string;
  section: 'FWD' | 'AFT' | 'BLK';
  containerId: string;
  contentCode: string;
  weightKg: string;
  pieces: string;
  percentage: string;
  notes: string;
  isDoorPosition: boolean;
  manualOrder: string;
}

const CONTENT_CODES = ['B', 'C', 'E', 'X', 'BF', 'Q', 'GB', 'Z'];

const AirCanadaCargoScanner: React.FC<AirCanadaCargoScannerProps> = ({ aircraftType }) => {
  const [arrivalData, setArrivalData] = useState<PositionData[]>([]);
  const [departureData, setDepartureData] = useState<PositionData[]>([]);
  const [activeTab, setActiveTab] = useState<'arrival' | 'departure'>('arrival');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!SUPPORTED_MODELS.includes(aircraftType)) return null;

  const currentData = activeTab === 'arrival' ? arrivalData : departureData;
  const setCurrentData = activeTab === 'arrival' ? setArrivalData : setDepartureData;

  const handleScan = async (file: File) => {
    setIsScanning(true);
    setScanError(null);
    try {
      const compressed = await compressImage(file);
      const reader = new FileReader();
      const base64: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(compressed);
      });
      const mimeType = compressed.type;

      const { data, error } = await supabase.functions.invoke('scan-load-sheet', {
        body: { imageBase64: base64, mimeType },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const mapped: PositionData[] = ((data as any).positions ?? [])
        .filter((p: any) => p.containerId)
        .map((p: any) => ({
          position: p.position,
          section: p.section,
          containerId: p.containerId ?? '',
          contentCode: p.contentCode ?? '',
          weightKg: String(p.weightKg ?? ''),
          pieces: String(p.pieces ?? ''),
          percentage: String(p.percentage ?? ''),
          notes: p.notes ?? '',
          isDoorPosition: p.isDoorPosition ?? false,
          manualOrder: '',
        }));

      setCurrentData(mapped);
    } catch (err) {
      console.error(err);
      setScanError('Error al escanear. Verifica la imagen e inténtalo de nuevo.');
    } finally {
      setIsScanning(false);
    }
  };

  const updateField = (position: string, field: keyof PositionData, value: string) => {
    setCurrentData((prev) =>
      prev.map((p) => (p.position === position ? { ...p, [field]: value } : p)),
    );
  };

  const PositionCell: React.FC<{ posKey: string }> = ({ posKey }) => {
    const pos = currentData.find((p) => p.position === posKey);
    if (!pos) {
      return (
        <div className="flex-1 border border-dashed border-muted rounded-md p-2 text-center text-xs text-muted-foreground">
          —
        </div>
      );
    }
    return (
      <div className="flex-1 border border-border rounded-md p-2 space-y-1.5 bg-card">
        <div className="flex items-center justify-between gap-1">
          <input
            type="number"
            value={pos.manualOrder}
            onChange={(e) => updateField(pos.position, 'manualOrder', e.target.value)}
            placeholder="–"
            className="w-8 h-6 text-center text-xs font-bold text-red-500 border border-red-500 rounded bg-transparent focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          {pos.isDoorPosition && (
            <span className="px-1.5 py-0.5 rounded bg-black text-white text-[9px] font-bold tracking-wider">
              PUERTA
            </span>
          )}
        </div>

        <Input
          type="text"
          value={pos.containerId}
          onChange={(e) => updateField(pos.position, 'containerId', e.target.value.toUpperCase())}
          placeholder="ID contenedor"
          className="h-7 font-mono text-xs px-1.5"
        />

        <div className="grid grid-cols-4 gap-1 items-center text-[10px]">
          <select
            value={pos.contentCode}
            onChange={(e) => updateField(pos.position, 'contentCode', e.target.value)}
            className="h-6 rounded border border-input bg-background text-xs px-1"
          >
            <option value=""></option>
            {CONTENT_CODES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="flex items-center gap-0.5">
            <input
              type="number"
              value={pos.weightKg}
              onChange={(e) => updateField(pos.position, 'weightKg', e.target.value)}
              placeholder="0"
              className="w-full h-6 text-xs border border-input rounded px-1 bg-background text-right"
            />
            <span className="text-muted-foreground">kg</span>
          </div>
          <div className="flex items-center gap-0.5">
            <input
              type="number"
              value={pos.pieces}
              onChange={(e) => updateField(pos.position, 'pieces', e.target.value)}
              placeholder="0"
              className="w-full h-6 text-xs border border-input rounded px-1 bg-background text-right"
            />
            <span className="text-muted-foreground">#</span>
          </div>
          <div className="flex items-center gap-0.5">
            <input
              type="number"
              value={pos.percentage}
              onChange={(e) => updateField(pos.position, 'percentage', e.target.value)}
              placeholder="100"
              className="w-full h-6 text-xs border border-input rounded px-1 bg-background text-right"
            />
            <span className="text-muted-foreground">%</span>
          </div>
        </div>

        <input
          type="text"
          value={pos.notes}
          onChange={(e) => updateField(pos.position, 'notes', e.target.value)}
          placeholder="Notas..."
          className="w-full h-6 text-[11px] text-muted-foreground border border-input rounded px-1.5 bg-background"
        />
      </div>
    );
  };

  const displayRows = groupPositionsForDisplay(
    currentData.map((p) => ({ section: p.section, position: p.position, isDoorPosition: p.isDoorPosition })),
  );

  let lastSection = '';

  return (
    <Card className="card-operational">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plane className="h-5 w-5 text-red-500" />
          Hoja de carga Air Canada
        </CardTitle>

        {/* Tabs */}
        <div className="flex gap-1 mt-2">
          <button
            type="button"
            onClick={() => setActiveTab('arrival')}
            className={cn(
              'flex-1 h-9 rounded-md text-xs font-semibold transition-colors',
              activeTab === 'arrival'
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                : 'bg-muted text-muted-foreground border border-transparent',
            )}
          >
            ✈️ Descarga — Llegada
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('departure')}
            className={cn(
              'flex-1 h-9 rounded-md text-xs font-semibold transition-colors',
              activeTab === 'departure'
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                : 'bg-muted text-muted-foreground border border-transparent',
            )}
          >
            ✈️ Carga — Salida
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleScan(file);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="gap-1.5 text-xs h-7 border-amber-500 bg-amber-500/10 text-amber-600 hover:bg-transparent"
          >
            {isScanning ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Escaneando...</>
            ) : (
              <><Camera className="h-3.5 w-3.5" /> Escanear hoja</>
            )}
          </Button>

          {currentData.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentData([])}
              className="gap-1.5 text-xs h-7 text-red-500 hover:text-red-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset {activeTab === 'arrival' ? 'Descarga' : 'Carga'}
            </Button>
          )}

          {currentData.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {currentData.length} posiciones
            </span>
          )}
        </div>

        {scanError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {scanError}
            </div>
          </div>
        )}

        {currentData.length === 0 && !isScanning && !scanError && (
          <div className="rounded-md border border-dashed border-muted p-6 text-center">
            <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Escanea la hoja de {activeTab === 'arrival' ? 'descarga' : 'carga'}
            </p>
          </div>
        )}

        {currentData.length > 0 && (
          <div className="space-y-2">
            {displayRows.map((row) => {
              const showHeader = row.section !== lastSection;
              lastSection = row.section;
              return (
                <React.Fragment key={`${row.section}-${row.rowKey}`}>
                  {showHeader && (
                    <div className="pt-2 pb-1">
                      <span className="text-xs font-bold tracking-wider text-muted-foreground">
                        {row.section}
                      </span>
                    </div>
                  )}
                  {row.single !== undefined ? (
                    <div className="flex items-stretch gap-2">
                      <div className="w-10 flex items-center justify-center text-xs font-mono font-bold text-muted-foreground">
                        {row.single}
                      </div>
                      <PositionCell posKey={row.single} />
                    </div>
                  ) : (
                    <div className="flex items-stretch gap-2">
                      <div className="w-10 flex items-center justify-center text-xs font-mono font-bold text-muted-foreground">
                        {row.left ? `${row.rowKey}L` : ''}
                      </div>
                      {row.left ? <PositionCell posKey={row.left} /> : <div className="flex-1" />}
                      <div className="w-px bg-border" />
                      {row.right ? <PositionCell posKey={row.right} /> : <div className="flex-1" />}
                      <div className="w-10 flex items-center justify-center text-xs font-mono font-bold text-muted-foreground">
                        {row.right ? `${row.rowKey}R` : ''}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AirCanadaCargoScanner;
