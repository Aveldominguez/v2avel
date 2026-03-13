import React, { useState } from 'react';
import { TurnaroundTimes, TimeValidationError, AirlineCode, getTimeFieldsForAirline, getPushBackField } from '@/types/turnaround';
import { getTurnaroundDuration, getCleaningMinutes } from '@/data/aircraftModels';
import { TimeInput } from './TimeInput';
import { BooleanInput } from './BooleanInput';
import { CountdownTimer } from './CountdownTimer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const getDockLabel = (airline: AirlineCode, dockNum: number): string => {
  const term = airline === 'FEDEX' ? 'Ristra' : 'Muelle';
  return `${dockNum}ª ${term}`;
};

interface AirlineTimesBlockProps {
  airline: AirlineCode;
  aircraftModel: string;
  isRemote: boolean;
  soloLlegada?: boolean;
  times: TurnaroundTimes;
  onChange: (times: TurnaroundTimes) => void;
  errors: TimeValidationError[];
  disabled?: boolean;
}

export const AirlineTimesBlock: React.FC<AirlineTimesBlockProps> = ({
  airline,
  aircraftModel,
  isRemote,
  soloLlegada = false,
  times,
  onChange,
  errors,
  disabled = false,
}) => {
  const fields = getTimeFieldsForAirline(airline, isRemote, soloLlegada);
  const durationMinutes = getTurnaroundDuration(airline, aircraftModel);
  const cleaningMins = getCleaningMinutes(airline, aircraftModel);

  // Push Back field: always in parking T, or in remote only if toggle is on
  const showPushBack = !isRemote || times.pushBack;
  const allFields = showPushBack ? [...fields, getPushBackField()] : fields;

  // Show extra docks if they have a value or user clicked +
  const [showDock2, setShowDock2] = useState(!!times.dock2 || !!times.dock3 || !!times.dock4);
  const [showDock3, setShowDock3] = useState(!!times.dock3 || !!times.dock4);
  const [showDock4, setShowDock4] = useState(!!times.dock4);

  // Show extra ristras for Amazon
  const [showRistra2, setShowRistra2] = useState(!!times.ristra2 || !!times.ristra3 || !!times.ristra4);
  const [showRistra3, setShowRistra3] = useState(!!times.ristra3 || !!times.ristra4);
  const [showRistra4, setShowRistra4] = useState(!!times.ristra4);

  const updateTime = (field: keyof TurnaroundTimes, value: string | null | boolean) => {
    onChange({ ...times, [field]: value });
  };

  const getError = (field: string): string | undefined => {
    return errors.find(e => e.field === field)?.message;
  };

  return (
    <Card className="card-operational">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-xl">
          <span>Control de Horas ⏰</span>
          {!soloLlegada && (
            <CountdownTimer chocksOnTime={times.chocksOnArrival} loadingEndTime={times.loadingEnd} durationMinutes={durationMinutes} cleaningMinutes={cleaningMins} />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {allFields.map((field) => {
            if (field.type === 'boolean-text') {
              const boolVal = times[field.key] as boolean;
              const textKey = `${String(field.key)}Data` as keyof TurnaroundTimes;
              return (
                <div key={field.key} className="col-span-2 flex items-end gap-3">
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

            // Render dock1 with a + button to add dock2
            if (field.key === 'dock1') {
              const nextDockToShow = !showDock2 ? 'dock2' : !showDock3 ? 'dock3' : !showDock4 ? 'dock4' : null;
              return (
                <React.Fragment key={field.key}>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {field.label}
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
                    <TimeInput
                      key="dock2"
                      label={getDockLabel(airline, 2)}
                      value={times.dock2 as string | null}
                      onChange={(v) => updateTime('dock2', v)}
                      error={getError('dock2')}
                      disabled={disabled}
                      clockColor="green"
                    />
                  )}
                  {showDock3 && (
                    <TimeInput
                      key="dock3"
                      label={getDockLabel(airline, 3)}
                      value={times.dock3 as string | null}
                      onChange={(v) => updateTime('dock3', v)}
                      error={getError('dock3')}
                      disabled={disabled}
                      clockColor="green"
                    />
                  )}
                  {showDock4 && (
                    <TimeInput
                      key="dock4"
                      label={getDockLabel(airline, 4)}
                      value={times.dock4 as string | null}
                      onChange={(v) => updateTime('dock4', v)}
                      error={getError('dock4')}
                      disabled={disabled}
                      clockColor="green"
                    />
                  )}
                </React.Fragment>
              );
            }

            // Render firstBag with + button for Amazon (Envío Ristras)
            if (field.key === 'firstBag' && airline === 'AMAZON') {
              const nextRistra = !showRistra2 ? 'ristra2' : !showRistra3 ? 'ristra3' : !showRistra4 ? 'ristra4' : null;
              return (
                <React.Fragment key={field.key}>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {field.label}
                      </label>
                      {nextRistra && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          onClick={() => {
                            if (nextRistra === 'ristra2') setShowRistra2(true);
                            else if (nextRistra === 'ristra3') setShowRistra3(true);
                            else if (nextRistra === 'ristra4') setShowRistra4(true);
                          }}
                          disabled={disabled}
                          className="h-6 w-6 shrink-0"
                          title={`Añadir Envío ${nextRistra === 'ristra2' ? '2ª' : nextRistra === 'ristra3' ? '3ª' : '4ª'} Ristra`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <TimeInput
                      value={times.firstBag as string | null}
                      onChange={(v) => updateTime('firstBag', v)}
                      error={getError('firstBag')}
                      disabled={disabled}
                      clockColor={field.clockColor || 'default'}
                    />
                  </div>
                  {showRistra2 && (
                    <TimeInput
                      key="ristra2"
                      label="Envío 2ª Ristra"
                      value={times.ristra2 as string | null}
                      onChange={(v) => updateTime('ristra2', v)}
                      error={getError('ristra2')}
                      disabled={disabled}
                      clockColor="green"
                    />
                  )}
                  {showRistra3 && (
                    <TimeInput
                      key="ristra3"
                      label="Envío 3ª Ristra"
                      value={times.ristra3 as string | null}
                      onChange={(v) => updateTime('ristra3', v)}
                      error={getError('ristra3')}
                      disabled={disabled}
                      clockColor="green"
                    />
                  )}
                  {showRistra4 && (
                    <TimeInput
                      key="ristra4"
                      label="Envío 4ª Ristra"
                      value={times.ristra4 as string | null}
                      onChange={(v) => updateTime('ristra4', v)}
                      error={getError('ristra4')}
                      disabled={disabled}
                      clockColor="green"
                    />
                  )}
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
          })}
        </div>
      </CardContent>
    </Card>
  );
};
