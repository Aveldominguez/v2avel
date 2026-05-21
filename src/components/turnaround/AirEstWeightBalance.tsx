import React from 'react';
import { FieldValue } from '@/types/turnaround';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plane, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface Props {
  fieldValues: FieldValue[];
  onChange: (values: FieldValue[]) => void;
  disabled?: boolean;
}

// SAAB 340F base data
const OEW = 7755;       // Operating empty weight (kg)
const MAX_FUEL = 2580;
const MZFW = 12020;
const MTOW = 13155;
const PAYLOAD_LIMIT = 3500;

interface CompSpec {
  id: 'A' | 'B1' | 'B2' | 'B3' | 'B4' | 'C1' | 'C2';
  label: string;
  zone: 'FWD' | 'CENTER' | 'AFT';
  zoneLabel: string;
  vol: number;
  max: number;
  floorNormal: number;
  floorSpreader?: number;
  use: string;
}

const COMPS: CompSpec[] = [
  { id: 'A',  label: 'A',  zone: 'FWD',    zoneLabel: 'Delantera / FWD',  vol: 2.1, max: 350, floorNormal: 365, use: 'Carga ligera, sacas, correo, bultos pequeños.' },
  { id: 'B1', label: 'B1', zone: 'CENTER', zoneLabel: 'Centro delantero', vol: 5.1, max: 900, floorNormal: 485, floorSpreader: 730, use: 'Carga media/pesada.' },
  { id: 'B2', label: 'B2', zone: 'CENTER', zoneLabel: 'Centro',            vol: 6.0, max: 900, floorNormal: 485, floorSpreader: 730, use: 'Carga pesada principal. Buena zona de balance.' },
  { id: 'B3', label: 'B3', zone: 'CENTER', zoneLabel: 'Centro',            vol: 5.7, max: 900, floorNormal: 485, floorSpreader: 730, use: 'Carga pesada principal. Buena zona de balance.' },
  { id: 'B4', label: 'B4', zone: 'CENTER', zoneLabel: 'Centro trasero',    vol: 7.6, max: 900, floorNormal: 485, floorSpreader: 730, use: 'Carga voluminosa o carga media/pesada.' },
  { id: 'C1', label: 'C1', zone: 'AFT',    zoneLabel: 'Trasera / AFT',     vol: 5.9, max: 715, floorNormal: 730, use: 'Carga trasera moderada.' },
  { id: 'C2', label: 'C2', zone: 'AFT',    zoneLabel: 'Cola / AFT final',  vol: 3.5, max: 270, floorNormal: 730, use: 'Carga ligera. No usar para mucho peso.' },
];

const FID = {
  A:    'airest-340f-w-a',
  B1:   'airest-340f-w-b1',
  B2:   'airest-340f-w-b2',
  B3:   'airest-340f-w-b3',
  B4:   'airest-340f-w-b4',
  C1:   'airest-340f-w-c1',
  C2:   'airest-340f-w-c2',
  FUEL: 'airest-340f-fuel',
  CREW: 'airest-340f-crew-count',
  CAVG: 'airest-340f-crew-avg',
  OBS:  'airest-340f-obs',
};

export const AirEstWeightBalance: React.FC<Props> = ({ fieldValues, onChange, disabled }) => {
  const getRaw = (fid: string): string =>
    fieldValues.find(v => v.fieldDefinitionId === fid)?.value || '';

  const getNum = (fid: string, fallback = 0): number => {
    const v = parseFloat(getRaw(fid).replace(',', '.'));
    return isNaN(v) ? fallback : v;
  };

  const setVal = (fid: string, value: string) => {
    const idx = fieldValues.findIndex(v => v.fieldDefinitionId === fid);
    const entry: FieldValue = {
      fieldDefinitionId: fid,
      value,
      updatedAt: new Date(),
    };
    const next = [...fieldValues];
    if (idx >= 0) next[idx] = entry; else next.push(entry);
    onChange(next);
  };

  const weights = {
    A: getNum(FID.A), B1: getNum(FID.B1), B2: getNum(FID.B2),
    B3: getNum(FID.B3), B4: getNum(FID.B4), C1: getNum(FID.C1), C2: getNum(FID.C2),
  };
  const fuel = getNum(FID.FUEL);
  const crewCount = getNum(FID.CREW);
  const crewAvgRaw = getRaw(FID.CAVG);
  const crewAvg = crewAvgRaw ? getNum(FID.CAVG, 85) : 85;

  const totalCargo = COMPS.reduce((acc, c) => acc + (weights[c.id] || 0), 0);
  const crewWeight = crewCount * crewAvg;
  const totalEstimated = OEW + fuel + crewWeight + totalCargo;
  const zfw = OEW + crewWeight + totalCargo;

  const zoneFwd = weights.A;
  const zoneCenter = weights.B1 + weights.B2 + weights.B3 + weights.B4;
  const zoneAft = weights.C1 + weights.C2;

  // Limit alerts
  const overComp = COMPS.filter(c => (weights[c.id] || 0) > c.max);
  const overPayload = totalCargo > PAYLOAD_LIMIT;
  const overFuel = fuel > MAX_FUEL;
  const overMTOW = totalEstimated > MTOW;
  const overMZFW = zfw > MZFW;

  // Balance flags
  const pctAft = totalCargo > 0 ? (zoneAft / totalCargo) * 100 : 0;
  const pctFwdB1 = totalCargo > 0 ? ((weights.A + weights.B1) / totalCargo) * 100 : 0;
  const pctCenter = totalCargo > 0 ? (zoneCenter / totalCargo) * 100 : 0;
  const heavyTailEmptyNose = (zoneAft > 400) && (weights.A === 0 && weights.B1 === 0);
  const heavyNoseEmptyTail = (weights.A > 200) && (weights.C1 === 0 && weights.C2 === 0);
  const b2b3Dominant = totalCargo > 0 && (weights.B2 + weights.B3) > totalCargo * 0.5;

  const hardLimit = overComp.length > 0 || overPayload || overMTOW || overMZFW || overFuel;
  const balanceWarn = pctAft > 70 || pctFwdB1 > 60 || heavyTailEmptyNose || heavyNoseEmptyTail;

  let status: 'green' | 'yellow' | 'red' = 'green';
  let statusMsg = 'Carga dentro de límites básicos y reparto aparentemente favorable.';
  if (hardLimit) {
    status = 'red';
    statusMsg = 'Carga fuera de límites. Revisar LIR antes de cargar.';
  } else if (balanceWarn || totalCargo === 0) {
    status = totalCargo === 0 ? 'yellow' : 'yellow';
    statusMsg = totalCargo === 0
      ? 'Introduce los pesos para calcular el balance.'
      : 'Carga dentro de peso, pero revisar reparto/balance.';
  }

  const statusStyles = {
    green:  'bg-emerald-950/40 border-emerald-500/60 text-emerald-200',
    yellow: 'bg-amber-950/40 border-amber-500/60 text-amber-200',
    red:    'bg-red-950/40 border-red-500/60 text-red-200',
  } as const;

  const StatusIcon = status === 'red' ? AlertTriangle : status === 'yellow' ? Info : CheckCircle2;

  const renderNumInput = (fid: string, placeholder: string, max?: number, step = '1') => {
    const val = getRaw(fid);
    const n = getNum(fid);
    const over = max !== undefined && n > max;
    return (
      <Input
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={val}
        onChange={(e) => setVal(fid, e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`h-10 text-right font-mono tabular-nums bg-input border-border ${over ? 'border-destructive text-destructive font-bold' : ''}`}
      />
    );
  };

  return (
    <div className="space-y-5">
      {/* Header / aircraft base data */}
      <div className="rounded-lg border border-border bg-card/40 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Plane className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-primary">SAAB 340F · Datos base</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
          <div><span className="text-muted-foreground">OEW:</span> <span className="font-bold">{OEW.toLocaleString()} kg</span></div>
          <div><span className="text-muted-foreground">Fuel máx:</span> <span className="font-bold">{MAX_FUEL.toLocaleString()} kg</span></div>
          <div><span className="text-muted-foreground">MZFW:</span> <span className="font-bold">{MZFW.toLocaleString()} kg</span></div>
          <div><span className="text-muted-foreground">MTOW:</span> <span className="font-bold">{MTOW.toLocaleString()} kg</span></div>
          <div className="col-span-2 md:col-span-4"><span className="text-muted-foreground">Payload práctico:</span> <span className="font-bold">{PAYLOAD_LIMIT.toLocaleString()} kg</span></div>
        </div>
      </div>

      {/* Compartments */}
      <div>
        <h3 className="text-sm font-bold text-primary mb-2 border-b border-border pb-1">COMPARTIMIENTOS</h3>
        <div className="space-y-2">
          {COMPS.map(c => {
            const w = weights[c.id];
            const over = w > c.max;
            const pct = Math.min(100, (w / c.max) * 100);
            const fid = FID[c.id as keyof typeof FID];
            return (
              <div key={c.id} className="rounded-md border border-border bg-card/30 p-2">
                <div className="flex items-start gap-2">
                  <div className="w-12 shrink-0">
                    <div className="text-lg font-black font-mono text-foreground leading-none">{c.label}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.zone}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-muted-foreground leading-tight">{c.zoneLabel} · {c.vol} m³ · máx <span className="font-bold text-foreground">{c.max} kg</span></div>
                    <div className="text-[10px] text-muted-foreground leading-tight">
                      Suelo {c.floorNormal} kg/m²{c.floorSpreader ? ` (${c.floorSpreader} con spreader)` : ''}
                    </div>
                  </div>
                  <div className="w-28 shrink-0">
                    {renderNumInput(fid, '0 kg', c.max)}
                  </div>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all ${over ? 'bg-destructive' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {over && (
                  <div className="mt-1 text-[11px] font-bold text-destructive">
                    ⚠️ Supera el máximo permitido ({c.max} kg)
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-end gap-2 pt-1 border-t border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total carga:</span>
          <span className={`font-mono font-bold text-lg ${overPayload ? 'text-destructive' : 'text-primary'}`}>{totalCargo.toLocaleString()} kg</span>
          <span className="text-xs text-muted-foreground">/ {PAYLOAD_LIMIT.toLocaleString()}</span>
        </div>
      </div>

      {/* Fuel + crew */}
      <div>
        <h3 className="text-sm font-bold text-primary mb-2 border-b border-border pb-1">COMBUSTIBLE Y TRIPULACIÓN</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1 uppercase tracking-wide">Combustible (kg)</label>
            {renderNumInput(FID.FUEL, '0', MAX_FUEL)}
            <div className="text-[10px] text-muted-foreground mt-1">Máx {MAX_FUEL} kg</div>
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1 uppercase tracking-wide">Nº Tripulantes</label>
            {renderNumInput(FID.CREW, '0')}
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1 uppercase tracking-wide">Peso medio tripulante (kg)</label>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={crewAvgRaw}
              onChange={(e) => setVal(FID.CAVG, e.target.value)}
              disabled={disabled}
              placeholder="85"
              className="h-10 text-right font-mono tabular-nums bg-input border-border"
            />
            <div className="text-[10px] text-muted-foreground mt-1">Por defecto 85 kg</div>
          </div>
        </div>
      </div>

      {/* Zone balance */}
      <div>
        <h3 className="text-sm font-bold text-primary mb-2 border-b border-border pb-1">REPARTO POR ZONAS</h3>
        <div className="grid grid-cols-3 gap-2 mb-2 text-center">
          {([
            { k: 'FWD', label: 'Delantera', val: zoneFwd, pct: totalCargo ? (zoneFwd/totalCargo)*100 : 0, color: 'bg-sky-500' },
            { k: 'CENTER', label: 'Central',  val: zoneCenter, pct: totalCargo ? (zoneCenter/totalCargo)*100 : 0, color: 'bg-emerald-500' },
            { k: 'AFT', label: 'Trasera', val: zoneAft, pct: totalCargo ? (zoneAft/totalCargo)*100 : 0, color: 'bg-orange-500' },
          ] as const).map(z => (
            <div key={z.k} className="rounded-md border border-border bg-card/30 p-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{z.label}</div>
              <div className="font-mono font-bold text-base">{z.val.toLocaleString()} kg</div>
              <div className="text-[11px] text-muted-foreground">{z.pct.toFixed(0)}%</div>
            </div>
          ))}
        </div>
        {totalCargo > 0 && (
          <div className="h-3 w-full rounded-full overflow-hidden flex border border-border">
            <div className="bg-sky-500" style={{ width: `${(zoneFwd/totalCargo)*100}%` }} title={`FWD ${zoneFwd} kg`} />
            <div className="bg-emerald-500" style={{ width: `${(zoneCenter/totalCargo)*100}%` }} title={`Central ${zoneCenter} kg`} />
            <div className="bg-orange-500" style={{ width: `${(zoneAft/totalCargo)*100}%` }} title={`AFT ${zoneAft} kg`} />
          </div>
        )}
        <div className="mt-2 space-y-1 text-xs">
          {pctAft > 70 && <div className="text-destructive font-bold">⚠️ Riesgo de centro de gravedad atrasado ({pctAft.toFixed(0)}% en zona trasera).</div>}
          {pctFwdB1 > 60 && <div className="text-destructive font-bold">⚠️ Carga muy adelantada ({pctFwdB1.toFixed(0)}% en A+B1).</div>}
          {heavyTailEmptyNose && <div className="text-amber-400 font-bold">⚠️ Mucho peso en C1+C2 con A y B1 vacíos.</div>}
          {heavyNoseEmptyTail && <div className="text-amber-400 font-bold">⚠️ Mucho peso en A con C1 y C2 vacíos.</div>}
          {b2b3Dominant && <div className="text-emerald-400 font-bold">✓ Reparto central favorable (B2+B3 dominante).</div>}
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-lg border border-border bg-card/40 p-3 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Peso tripulación:</span><span className="font-mono font-bold">{crewWeight.toLocaleString()} kg</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Total carga:</span><span className={`font-mono font-bold ${overPayload ? 'text-destructive' : ''}`}>{totalCargo.toLocaleString()} kg</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">ZFW estimado:</span><span className={`font-mono font-bold ${overMZFW ? 'text-destructive' : ''}`}>{zfw.toLocaleString()} kg <span className="text-[10px] text-muted-foreground">/ {MZFW.toLocaleString()}</span></span></div>
        <div className="flex justify-between border-t border-border pt-1 mt-1"><span className="font-bold">Peso total estimado:</span><span className={`font-mono font-bold ${overMTOW ? 'text-destructive' : 'text-primary'}`}>{totalEstimated.toLocaleString()} kg <span className="text-[10px] text-muted-foreground">/ {MTOW.toLocaleString()}</span></span></div>
      </div>

      {/* Limit alerts */}
      {hardLimit && (
        <div className="rounded-lg border border-destructive bg-red-950/30 p-3 space-y-1 text-xs">
          <div className="font-bold text-destructive uppercase tracking-wide mb-1">Límites superados</div>
          {overComp.map(c => <div key={c.id}>• {c.label}: {weights[c.id]} kg &gt; máx {c.max} kg</div>)}
          {overPayload && <div>• Total carga {totalCargo} kg &gt; payload {PAYLOAD_LIMIT} kg</div>}
          {overFuel && <div>• Combustible {fuel} kg &gt; máx {MAX_FUEL} kg</div>}
          {overMZFW && <div>• ZFW {zfw} kg &gt; MZFW {MZFW} kg</div>}
          {overMTOW && <div>• Peso total {totalEstimated} kg &gt; MTOW {MTOW} kg</div>}
        </div>
      )}

      {/* Final recommendation */}
      <div className={`rounded-lg border-2 p-3 flex items-start gap-2 ${statusStyles[status]}`}>
        <StatusIcon className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <div className="text-xs uppercase font-bold tracking-wide">
            {status === 'green' ? 'Recomendación: VERDE' : status === 'yellow' ? 'Recomendación: AMARILLO' : 'Recomendación: ROJO'}
          </div>
          <div className="text-sm">{statusMsg}</div>
        </div>
      </div>

      {/* Observations */}
      <div>
        <label className="block text-xs font-bold text-foreground/80 mb-1 uppercase tracking-wide">Observaciones de carga</label>
        <Textarea
          value={getRaw(FID.OBS)}
          onChange={(e) => setVal(FID.OBS, e.target.value.toUpperCase())}
          disabled={disabled}
          placeholder="—"
          rows={3}
          className="font-mono text-sm bg-input border-border"
        />
      </div>

      {/* Tips */}
      <details className="rounded-md border border-border bg-card/30 p-2 text-xs">
        <summary className="cursor-pointer font-bold uppercase tracking-wide text-muted-foreground">Consejos de carga / descarga</summary>
        <div className="mt-2 grid md:grid-cols-2 gap-3">
          <div>
            <div className="font-bold text-foreground mb-1">Carga</div>
            <ul className="space-y-0.5 list-disc list-inside text-muted-foreground">
              <li>Cargar primero B2 y B3.</li>
              <li>Después completar B1 y B4.</li>
              <li>Usar C1 para ajuste trasero moderado.</li>
              <li>Usar A y C2 solo para carga ligera o ajuste fino.</li>
              <li>No concentrar mercancía muy pesada en un punto pequeño.</li>
              <li>Si el bulto es denso, revisar kg/m² y usar repartidores.</li>
            </ul>
          </div>
          <div>
            <div className="font-bold text-foreground mb-1">Descarga</div>
            <ul className="space-y-0.5 list-disc list-inside text-muted-foreground">
              <li>Evitar dejar mucho peso en cola con la parte delantera vacía.</li>
              <li>Descargar de forma equilibrada.</li>
              <li>Controlar especialmente C1 y C2.</li>
              <li>Mantener B2/B3 como referencia de estabilidad hasta el final.</li>
            </ul>
          </div>
        </div>
      </details>

      <div className="text-[10px] text-muted-foreground italic leading-tight">
        Este simulador no sustituye la hoja oficial de carga, loadsheet, LIR ni cálculo certificado de peso y centrado. Solo sirve como apoyo operativo para rampa.
      </div>
    </div>
  );
};
