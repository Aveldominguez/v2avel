import React, { useState } from 'react';
import { TurnaroundTimes, TimeValidationError, AirlineCode, getTimeFieldsForAirline, getPushBackField, usesSplitLayout, getArrivalFields, getDepartureFields, TimeFieldConfig, AIRLINE_PREFIXES } from '@/types/turnaround';
import { getTurnaroundDuration, getCleaningMinutes } from '@/data/aircraftModels';
import { TimeInput } from './TimeInput';
import { BooleanInput } from './BooleanInput';
import { CountdownTimer } from './CountdownTimer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, PlaneLanding, PlaneTakeoff } from 'lucide-react';

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
    return (
      <BooleanInput
        key={field.key}
        label={field.label}
        value={times[field.key] as boolean}
        onChange={(v) => updateTime(field.key, v)}
        disabled={disabled}
      />
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
}) => {
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

  const updateTime = (field: keyof TurnaroundTimes, value: string | null | boolean) => {
    onChange({ ...times, [field]: value });
  };

  const getError = (field: string): string | undefined => {
    return errors.find(e => e.field === field)?.message;
  };

  const prefix = AIRLINE_PREFIXES[airline] || '';

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
        <Card className="card-operational">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-xl">
              <span>Control de Horas ⏰</span>
              {!soloLlegada && !soloSalida && (
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
          </CardHeader>
        </Card>

        {/* Arrival block */}
        {filteredArrival.length > 0 && (
          <Card className="border-2 border-emerald-500/30 bg-emerald-50/5">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <PlaneLanding className="h-5 w-5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Vuelo de llegada</span>
                <span className="ml-1 font-mono text-base text-muted-foreground">{flightNumber}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {filteredArrival.map((field) => (
                  <FieldRenderer key={field.key} field={field} {...sharedFieldProps} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Departure block */}
        {departureWithPushBack.length > 0 && (
          <Card className="border-2 border-rose-500/30 bg-rose-50/5">
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
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {departureWithPushBack.map((field) => (
                  <FieldRenderer key={field.key} field={field} {...sharedFieldProps} />
                ))}
              </div>
            </CardContent>
          </Card>
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
        <CardTitle className="flex items-center justify-between text-xl">
          <span>Control de Horas ⏰</span>
          {!soloLlegada && !soloSalida && (
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
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {allFields.map((field) => (
            <FieldRenderer key={field.key} field={field} {...sharedFieldProps} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
