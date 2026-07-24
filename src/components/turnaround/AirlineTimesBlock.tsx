import React, { useState } from 'react';
import { useCatalog } from '@/hooks/useCatalog';
import { TurnaroundTimes, TimeValidationError, AirlineCode, getTimeFieldsForAirline, getPushBackField, usesSplitLayout, getArrivalFields, getDepartureFields, TimeFieldConfig, getAirlinePrefix, getCargoMailDestination } from '@/types/turnaround';
import { getTurnaroundDuration, getCleaningMinutes } from '@/data/aircraftModels';
import { TimeInput } from './TimeInput';
import { BooleanInput } from './BooleanInput';
import { CountdownTimer } from './CountdownTimer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, PlaneLanding, PlaneTakeoff, ChevronDown, ChevronUp, Plane } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const getDockLabel = (airline: AirlineCode, dockNum: number): string => {
  const term = (airline === 'FEDEX' || airline === 'AMAZON') ? 'Ristra' : 'Muelle';
  return `${dockNum}ª ${term}`;
};

interface AirlineTimesBlockProps {
  airline: AirlineCode;
  aircraftModel: string;
  isRemote: boolean;
  soloLlegada?: boolean;
  soloSalida?: boolean;
  times: TurnaroundTimes;
  onChange: (times: TurnaroundTimes) => void;
  errors: TimeValidationError[];
  disabled?: boolean;
  departureTime?: string | null;
  onDepartureTimeChange?: (value: string | null) => void;
  flightNumber?: string;
  ldmRaw?: string | null;
  scheduledArrival?: string | null;
  scheduledEta?: string | null;
  scheduledStd?: string | null;
  scheduledEtd?: string | null;
  flightDate?: Date;

}

// Shared field renderer
const FieldRenderer: React.FC<{
  field: TimeFieldConfig;
  times: TurnaroundTimes;
  updateTime: (field: keyof TurnaroundTimes, value: string | null | boolean) => void;
  onChange: (times: TurnaroundTimes) => void;
  getError: (field: string) => string | undefined;
  disabled: boolean;
  airline: AirlineCode;
  // Dock state
  showDock2: boolean; setShowDock2: (v: boolean) => void;
  showDock3: boolean; setShowDock3: (v: boolean) => void;
  showDock4: boolean; setShowDock4: (v: boolean) => void;
  // Bus state
  busKeys: (keyof TurnaroundTimes)[];
  visibleBusCount: number; setVisibleBusCount: React.Dispatch<React.SetStateAction<number>>;
  // Ristra state (Amazon)
  showRistra2: boolean; setShowRistra2: (v: boolean) => void;
  showRistra3: boolean; setShowRistra3: (v: boolean) => void;
  showRistra4: boolean; setShowRistra4: (v: boolean) => void;
}> = ({ field, times, updateTime, onChange, getError, disabled, airline, showDock2, setShowDock2, showDock3, setShowDock3, showDock4, setShowDock4, busKeys, visibleBusCount, setVisibleBusCount, showRistra2, setShowRistra2, showRistra3, setShowRistra3, showRistra4, setShowRistra4 }) => {
  if (field.type === 'acu') {
    const boolVal = times[field.key] as boolean;
    const textKey = `${String(field.key)}Data` as keyof TurnaroundTimes;
    const startKey = `${String(field.key)}Start` as keyof TurnaroundTimes;
    const endKey = `${String(field.key)}End` as keyof TurnaroundTimes;
    return (
      <div key={field.key} className={boolVal ? "col-span-2 md:col-span-3 xl:col-span-4 flex flex-col gap-2" : ""}>
        <div className="flex items-end gap-3">
          <BooleanInput
            label={field.label}
            value={boolVal}
            onChange={(v) => {
              if (!v) {
                onChange({ ...times, [field.key]: false, [textKey]: null, [startKey]: null, [endKey]: null });
              } else {
                updateTime(field.key, true);
              }
            }}
            disabled={disabled}
          />
          {boolVal && (
            <div className="flex-1">
              <Input
                type="text"
                value={(times[textKey] as string) || ''}
                onChange={(e) => updateTime(textKey, e.target.value.toUpperCase())}
                disabled={disabled}
                placeholder={`Datos ${field.label}`}
                className="h-12 font-mono text-base"
              />
            </div>
          )}
        </div>
        {boolVal && (
          <div className="grid grid-cols-2 gap-3">
            <TimeInput
              label={`${field.label} Inicio`}
              value={times[startKey] as string | null}
              onChange={(v) => updateTime(startKey, v)}
              disabled={disabled}
              clockColor="green"
            />
            <TimeInput
              label={`${field.label} Retirada`}
              value={times[endKey] as string | null}
              onChange={(v) => updateTime(endKey, v)}
              disabled={disabled}
              clockColor="red"
            />
          </div>
        )}
      </div>
    );
  }

  if (field.type === 'boolean-text') {
    const boolVal = times[field.key] as boolean;
    const textKey = `${String(field.key)}Data` as keyof TurnaroundTimes;
    return (
      <div key={field.key} className={boolVal ? "col-span-2 flex items-end gap-3" : "flex items-end gap-3"}>
        <BooleanInput
          label={field.label}
          value={boolVal}
          onChange={(v) => {
            if (!v) {
              onChange({ ...times, [field.key]: false, [textKey]: null });
            } else {
              updateTime(field.key, true);
            }
          }}
          disabled={disabled}
        />
        {boolVal && (
          <div className="flex-1">
            <Input
              type="text"
              value={(times[textKey] as string) || ''}
              onChange={(e) => updateTime(textKey, e.target.value.toUpperCase())}
              disabled={disabled}
              placeholder="Datos ASU"
              className="h-12 font-mono text-base"
            />
          </div>
        )}
      </div>
    );
  }

  if (field.type === 'boolean') {
    const warning =
      field.key === 'cargoDeparture'
        ? 'Toda mercancía con rombo se debe atar obligatoriamente. Solicitar NOTOC: siempre que cargues AVI, mercancía peligrosa y HUM.'
        : field.key === 'aviDeparture'
        ? 'Recuerda firmar el NOTOC al cargar un AVI o AVIH'
        : undefined;

    const destination =
      field.key === 'cargoArrival' || field.key === 'cargoDeparture' ||
      field.key === 'mailArrival' || field.key === 'mailDeparture'
        ? getCargoMailDestination(airline, field.key) || undefined
        : undefined;

    const destinationLabel =
      field.key === 'cargoDeparture' || field.key === 'mailDeparture'
        ? 'Procedente de'
        : field.key === 'cargoArrival' || field.key === 'mailArrival'
        ? 'Destino'
        : undefined;

    const isActive = times[field.key] as boolean;

    return (
      <React.Fragment key={field.key}>
        <BooleanInput
          label={field.label}
          value={isActive}
          onChange={(v) => updateTime(field.key, v)}
          disabled={disabled}
          destination={destination}
          destinationLabel={destinationLabel}
        />
        {isActive && warning && (
          <div className="col-span-2 md:col-span-3 lg:col-span-4 xl:col-span-6 rounded-md p-3 text-xs font-semibold border border-amber-500 bg-amber-500/10 text-amber-600">
            {warning}
          </div>
        )}
      </React.Fragment>
    );
  }

  // Dynamic jardinera fields
  if (field.key === 'busArrival') {
    return (
      <React.Fragment key="jardineras">
        {busKeys.slice(0, visibleBusCount).map((bKey, bIdx) => (
          <div key={bKey} className="relative">
            <TimeInput
              label={`${bIdx + 1}ª Jardinera`}
              value={times[bKey] as string | null}
              onChange={(v) => updateTime(bKey, v)}
              error={getError(String(bKey))}
              disabled={disabled}
            />
            {bIdx === visibleBusCount - 1 && visibleBusCount < busKeys.length && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => setVisibleBusCount(v => v + 1)}
                disabled={disabled}
                className="h-5 w-5 shrink-0 absolute top-0 right-0"
                title={`Añadir ${visibleBusCount + 1}ª Jardinera`}
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </React.Fragment>
    );
  }

  // Dock fields
  if (field.key === 'dock1') {
    const nextDockToShow = !showDock2 ? 'dock2' : !showDock3 ? 'dock3' : !showDock4 ? 'dock4' : null;
    return (
      <React.Fragment key={field.key}>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
              {(airline === 'FEDEX' || airline === 'AMAZON') ? '1ª Ristra' : field.label}
            </label>
            {nextDockToShow && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => {
                  if (nextDockToShow === 'dock2') setShowDock2(true);
                  else if (nextDockToShow === 'dock3') setShowDock3(true);
                  else if (nextDockToShow === 'dock4') setShowDock4(true);
                }}
                disabled={disabled}
                className="h-6 w-6 shrink-0"
                title={`Añadir ${getDockLabel(airline, nextDockToShow === 'dock2' ? 2 : nextDockToShow === 'dock3' ? 3 : 4)}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <TimeInput
            value={times.dock1 as string | null}
            onChange={(v) => updateTime('dock1', v)}
            error={getError('dock1')}
            disabled={disabled}
            clockColor={field.clockColor || 'default'}
          />
        </div>
        {showDock2 && (
          <TimeInput key="dock2" label={getDockLabel(airline, 2)} value={times.dock2 as string | null} onChange={(v) => updateTime('dock2', v)} error={getError('dock2')} disabled={disabled} clockColor="green" />
        )}
        {showDock3 && (
          <TimeInput key="dock3" label={getDockLabel(airline, 3)} value={times.dock3 as string | null} onChange={(v) => updateTime('dock3', v)} error={getError('dock3')} disabled={disabled} clockColor="green" />
        )}
        {showDock4 && (
          <TimeInput key="dock4" label={getDockLabel(airline, 4)} value={times.dock4 as string | null} onChange={(v) => updateTime('dock4', v)} error={getError('dock4')} disabled={disabled} clockColor="green" />
        )}
      </React.Fragment>
    );
  }

  // Ristra fields (Amazon)
  if (field.key === 'firstBag' && airline === 'AMAZON') {
    const nextRistra = !showRistra2 ? 'ristra2' : !showRistra3 ? 'ristra3' : !showRistra4 ? 'ristra4' : null;
    return (
      <React.Fragment key={field.key}>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
              {field.label}
            </label>
            {nextRistra && (
              <Button
                type="button" variant="secondary" size="icon"
                onClick={() => {
                  if (nextRistra === 'ristra2') setShowRistra2(true);
                  else if (nextRistra === 'ristra3') setShowRistra3(true);
                  else if (nextRistra === 'ristra4') setShowRistra4(true);
                }}
                disabled={disabled} className="h-6 w-6 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <TimeInput value={times.firstBag as string | null} onChange={(v) => updateTime('firstBag', v)} error={getError('firstBag')} disabled={disabled} clockColor={field.clockColor || 'default'} />
        </div>
        {showRistra2 && <TimeInput key="ristra2" label="Envío 2ª Ristra" value={times.ristra2 as string | null} onChange={(v) => updateTime('ristra2', v)} error={getError('ristra2')} disabled={disabled} clockColor="green" />}
        {showRistra3 && <TimeInput key="ristra3" label="Envío 3ª Ristra" value={times.ristra3 as string | null} onChange={(v) => updateTime('ristra3', v)} error={getError('ristra3')} disabled={disabled} clockColor="green" />}
        {showRistra4 && <TimeInput key="ristra4" label="Envío 4ª Ristra" value={times.ristra4 as string | null} onChange={(v) => updateTime('ristra4', v)} error={getError('ristra4')} disabled={disabled} clockColor="green" />}
      </React.Fragment>
    );
  }

  return (
    <TimeInput
      key={field.key}
      label={field.label}
      value={times[field.key] as string | null}
      onChange={(v) => updateTime(field.key, v)}
      error={getError(field.key)}
      disabled={disabled}
      clockColor={field.clockColor || 'default'}
    />
  );
};

export const AirlineTimesBlock: React.FC<AirlineTimesBlockProps> = ({
  airline,
  aircraftModel,
  isRemote,
  soloLlegada = false,
  soloSalida = false,
  times,
  onChange,
  errors,
  disabled = false,
  departureTime,
  onDepartureTimeChange,
  flightNumber = '',
  ldmRaw,
  scheduledArrival,
  scheduledEta,
  scheduledStd,
  scheduledEtd,
  flightDate,

}) => {
  useCatalog(); // subscribe to admin overrides so visibility/labels update live
  const durationMinutes = getTurnaroundDuration(airline, aircraftModel);
  const cleaningMins = getCleaningMinutes(airline, aircraftModel);

  const showPushBack = !isRemote || times.pushBack;

  // Dock state
  const [showDock2, setShowDock2] = useState(!!times.dock2 || !!times.dock3 || !!times.dock4);
  const [showDock3, setShowDock3] = useState(!!times.dock3 || !!times.dock4);
  const [showDock4, setShowDock4] = useState(!!times.dock4);

  // Bus state
  const BUS_KEYS: (keyof TurnaroundTimes)[] = ['busArrival', 'bus2', 'bus3', 'bus4', 'bus5', 'bus6'];
  const existingBusCount = BUS_KEYS.filter(k => times[k]).length;
  const [visibleBusCount, setVisibleBusCount] = useState(Math.max(1, existingBusCount));

  // Ristra state
  const [showRistra2, setShowRistra2] = useState(!!times.ristra2 || !!times.ristra3 || !!times.ristra4);
  const [showRistra3, setShowRistra3] = useState(!!times.ristra3 || !!times.ristra4);
  const [showRistra4, setShowRistra4] = useState(!!times.ristra4);

  // LDM dialog state
  const [showLdm, setShowLdm] = useState(false);

  // CPM dialog state
  const [showCpm, setShowCpm] = useState(false);
  const storedCpm = (times as any).cpmRawLines as string[] | null | undefined;
  const [cpmLines, setCpmLines] = useState<string[] | null>(storedCpm && storedCpm.length > 0 ? storedCpm : null);
  const [cpmLoading, setCpmLoading] = useState(false);

  const cleanFlightNumber = (flightNumber || '').trim().toUpperCase();
  const flightDateIso = flightDate ? format(flightDate, 'yyyy-MM-dd') : null;
  const cpmFetchable = !!cleanFlightNumber && !!flightDateIso;
  const cpmAvailable = cpmFetchable || (storedCpm && storedCpm.length > 0);

  const openCpm = async () => {
    setShowCpm(true);
    if (cpmLines !== null || !cpmFetchable) return;
    setCpmLoading(true);
    const { data } = await supabase
      .from('flight_cpm_data')
      .select('raw_line')
      .eq('arrival_fn', cleanFlightNumber)
      .eq('flight_date', flightDateIso!)
      .order('line_number', { ascending: true });
    const lines = (data || []).map((r: any) => r.raw_line ?? '');
    setCpmLines(lines);
    setCpmLoading(false);
    // Persist snapshot so it survives in the saved turnaround and in PDF exports
    if (lines.length > 0) {
      onChange({ ...times, cpmRawLines: lines } as TurnaroundTimes);
    }
  };



  // Collapsible arrival/departure sections (split layout only)
  const [arrivalOpen, setArrivalOpen] = useState(true);
  // El bloque de salida se muestra desplegado por defecto para facilitar el registro de horas.
  const [departureOpen, setDepartureOpen] = useState(true);
  const prevUnloadingEndRef = React.useRef(times.unloadingEnd);
  React.useEffect(() => {
    if (!prevUnloadingEndRef.current && times.unloadingEnd) {
      setArrivalOpen(false);
      setDepartureOpen(true);
    }
    prevUnloadingEndRef.current = times.unloadingEnd;
  }, [times.unloadingEnd]);

  const updateTime = (field: keyof TurnaroundTimes, value: string | null | boolean) => {
    onChange({ ...times, [field]: value });
  };

  const getError = (field: string): string | undefined => {
    return errors.find(e => e.field === field)?.message;
  };

  const prefix = getAirlinePrefix(airline);

  const sharedFieldProps = {
    times, updateTime, onChange, getError, disabled, airline,
    showDock2, setShowDock2, showDock3, setShowDock3, showDock4, setShowDock4,
    busKeys: BUS_KEYS, visibleBusCount, setVisibleBusCount,
    showRistra2, setShowRistra2, showRistra3, setShowRistra3, showRistra4, setShowRistra4,
  };

  // Split layout for non-FedEx/Amazon
  if (usesSplitLayout(airline)) {
    const arrivalFields = getArrivalFields(airline, isRemote);
    const departureFields = getDepartureFields(airline, isRemote);

    // Filter for solo modes
    const filteredArrival = soloSalida ? [] : arrivalFields;
    const filteredDeparture = soloLlegada ? [] : departureFields;

    // Add push back to departure if needed
    const departureWithPushBack = showPushBack && !soloLlegada
      ? [...filteredDeparture, getPushBackField()]
      : filteredDeparture;

    return (
      <div className="space-y-4">
        {/* Header with countdown */}
        <Card className="aero-control-hours card-operational">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="aero-control-hours-title flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xl">
              <div className="flex items-center justify-between gap-3 w-full">
                <span className="shrink-0">Control de Horas ⏰</span>
                <div className="flex flex-col items-end gap-1">
                  {ldmRaw && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs font-bold tracking-wider border-amber-500 bg-amber-500/10 text-amber-600 hover:bg-transparent"
                      onClick={() => setShowLdm(true)}
                    >
                      VER LDM
                    </Button>
                  )}
                  {cpmAvailable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs font-bold tracking-wider border-amber-500 bg-amber-500/10 text-amber-600 hover:bg-transparent"
                      onClick={openCpm}
                    >
                      VER CPM
                    </Button>
                  )}
                </div>
              </div>
              {!soloLlegada && (
                <CountdownTimer
                  chocksOnTime={times.chocksOnArrival}
                  loadingEndTime={times.loadingEnd}
                  chocksOffTime={times.chocksOff}
                  durationMinutes={durationMinutes}
                  cleaningMinutes={cleaningMins}
                  departureTime={departureTime}
                  onDepartureTimeChange={onDepartureTimeChange}
                />
              )}
            </CardTitle>
            {/* STA / ETA / STD row */}
            {(scheduledArrival || scheduledEta || scheduledStd || scheduledEtd) && (
              <div className="flex items-center justify-center gap-0.5 overflow-x-auto flex-nowrap w-full text-[13px] font-mono">
                {scheduledArrival && (
                  <span className="shrink-0 px-1 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-semibold whitespace-nowrap text-center">
                    STA {scheduledArrival}
                  </span>
                )}
                {scheduledEta && scheduledEta !== scheduledArrival && (
                  <span className="shrink-0 px-1 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-semibold whitespace-nowrap text-center">
                    ETA {scheduledEta}
                  </span>
                )}
                {scheduledStd && (
                  <span className="shrink-0 px-1 py-0.5 rounded-full bg-rose-500/20 text-rose-500 font-semibold whitespace-nowrap text-center">
                    STD {scheduledStd}
                  </span>
                )}
                {scheduledEtd && (
                  <span className="shrink-0 px-1 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold whitespace-nowrap text-center">
                    ETD {scheduledEtd}
                  </span>
                )}
              </div>
            )}

          </CardHeader>
        </Card>


        {/* Arrival block */}
        {filteredArrival.length > 0 && (
          <Card className="aero-soft-arrival border-2 border-emerald-500/30 bg-emerald-50/5">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <PlaneLanding className="h-5 w-5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Vuelo de llegada</span>
                <span className="ml-1 font-mono text-base text-muted-foreground">{flightNumber}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setArrivalOpen(o => !o)}
                  className="ml-auto h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-400"
                  title={arrivalOpen ? 'Contraer' : 'Desplegar'}
                  aria-label={arrivalOpen ? 'Contraer vuelo de llegada' : 'Desplegar vuelo de llegada'}
                >
                  {arrivalOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
              </CardTitle>
            </CardHeader>
            {arrivalOpen && (
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {filteredArrival.map((field) => (
                    <FieldRenderer key={field.key} field={field} {...sharedFieldProps} />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Departure block */}
        {departureWithPushBack.length > 0 && (
          <Card className="aero-soft-departure border-2 border-rose-500/30 bg-rose-50/5">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <PlaneTakeoff className="h-5 w-5 text-rose-500" />
                <span className="text-rose-600 dark:text-rose-400">Vuelo de salida</span>
                <div className="flex items-center gap-1 ml-1">
                  <span className="text-sm font-mono text-muted-foreground">{prefix}</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={(times.departureFlightNumber || '').replace(prefix, '')}
                    onChange={(e) => {
                      const numVal = e.target.value.replace(/\D/g, '');
                      updateTime('departureFlightNumber', numVal ? prefix + numVal : null);
                    }}
                    disabled={disabled}
                    placeholder="Nº"
                    className="h-8 w-20 font-mono text-sm px-2"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDepartureOpen(o => !o)}
                  className="ml-auto h-8 w-8 shrink-0 text-rose-600 dark:text-rose-400"
                  title={departureOpen ? 'Contraer' : 'Desplegar'}
                  aria-label={departureOpen ? 'Contraer vuelo de salida' : 'Desplegar vuelo de salida'}
                >
                  {departureOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
              </CardTitle>
            </CardHeader>
            {departureOpen && (
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {departureWithPushBack.map((field) => (
                    <FieldRenderer key={field.key} field={field} {...sharedFieldProps} />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* LDM dialog */}
        {showLdm && ldmRaw && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowLdm(false)}>
            <div className="bg-background rounded-lg shadow-xl max-w-lg w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-mono">LDM</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowLdm(false)}>✕</Button>
              </div>
              <pre className="text-sm font-mono bg-muted p-4 rounded-lg whitespace-pre-wrap leading-relaxed overflow-auto max-h-96">
                {ldmRaw}
              </pre>
            </div>
          </div>
        )}

        {/* CPM dialog */}
        {showCpm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCpm(false)}>
            <div className="bg-background rounded-lg shadow-xl max-w-lg w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-mono">CPM</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowCpm(false)}>✕</Button>
              </div>
              <pre className="text-sm font-mono bg-muted p-4 rounded-lg whitespace-pre-wrap leading-relaxed overflow-auto max-h-96">
                {cpmLoading
                  ? 'Cargando...'
                  : (cpmLines && cpmLines.length > 0)
                    ? cpmLines.join('\n')
                    : 'Sin datos CPM para este vuelo'}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Legacy flat layout for FedEx and Amazon
  const fields = getTimeFieldsForAirline(airline, isRemote, soloLlegada, soloSalida);
  const allFields = showPushBack ? [...fields, getPushBackField()] : fields;

  return (
    <Card className="card-operational">
      <CardHeader className="pb-4">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xl">
          <div className="flex items-center justify-between gap-3 w-full">
            <span className="shrink-0">Control de Horas ⏰</span>
            <div className="flex flex-col items-end gap-1">
              {ldmRaw && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs font-bold tracking-wider border-amber-500 bg-amber-500/10 text-amber-600 hover:bg-transparent"
                  onClick={() => setShowLdm(true)}
                >
                  VER LDM
                </Button>
              )}
              {cpmAvailable && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs font-bold tracking-wider border-amber-500 bg-amber-500/10 text-amber-600 hover:bg-transparent"
                  onClick={openCpm}
                >
                  VER CPM
                </Button>
              )}
            </div>
          </div>
          {!soloLlegada && (
            <CountdownTimer
              chocksOnTime={times.chocksOnArrival}
              loadingEndTime={times.loadingEnd}
              chocksOffTime={times.chocksOff}
              durationMinutes={durationMinutes}
              cleaningMinutes={cleaningMins}
              departureTime={departureTime}
              onDepartureTimeChange={onDepartureTimeChange}
            />
          )}
        </CardTitle>
        {/* STA / ETA / STD row */}
        {(scheduledArrival || scheduledEta || scheduledStd) && (
          <div className="flex items-center gap-2 flex-wrap mt-2 text-xs font-mono">
            {scheduledArrival && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-semibold">
                STA {scheduledArrival}
              </span>
            )}
            {scheduledEta && scheduledEta !== scheduledArrival && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-semibold">
                ETA {scheduledEta}
              </span>
            )}
            {scheduledStd && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-500 font-semibold">
                STD {scheduledStd}
              </span>
            )}
          </div>
        )}

      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {allFields.map((field) => (
            <FieldRenderer key={field.key} field={field} {...sharedFieldProps} />
          ))}
        </div>
      </CardContent>

      {/* LDM dialog */}
      {showLdm && ldmRaw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowLdm(false)}>
          <div className="bg-background rounded-lg shadow-xl max-w-lg w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-mono">LDM</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowLdm(false)}>✕</Button>
            </div>
            <pre className="text-sm font-mono bg-muted p-4 rounded-lg whitespace-pre-wrap leading-relaxed overflow-auto max-h-96">
              {ldmRaw}
            </pre>
          </div>
        </div>
      )}

      {/* CPM dialog */}
      {showCpm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCpm(false)}>
          <div className="bg-background rounded-lg shadow-xl max-w-lg w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-mono">CPM</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCpm(false)}>✕</Button>
            </div>
            <pre className="text-sm font-mono bg-muted p-4 rounded-lg whitespace-pre-wrap leading-relaxed overflow-auto max-h-96">
              {cpmLoading
                ? 'Cargando...'
                : (cpmLines && cpmLines.length > 0)
                  ? cpmLines.join('\n')
                  : 'Sin datos CPM para este vuelo'}
            </pre>
          </div>
        </div>
      )}
    </Card>
  );
};
