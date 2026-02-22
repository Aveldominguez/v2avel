import React, { useState } from 'react';
import { TurnaroundTimes, TimeValidationError, AirlineCode, getTimeFieldsForAirline } from '@/types/turnaround';
import { getTurnaroundDuration, getCleaningMinutes } from '@/data/aircraftModels';
import { TimeInput } from './TimeInput';
import { BooleanInput } from './BooleanInput';
import { CountdownTimer } from './CountdownTimer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface AirlineTimesBlockProps {
  airline: AirlineCode;
  aircraftModel: string;
  isRemote: boolean;
  times: TurnaroundTimes;
  onChange: (times: TurnaroundTimes) => void;
  errors: TimeValidationError[];
  disabled?: boolean;
}

export const AirlineTimesBlock: React.FC<AirlineTimesBlockProps> = ({
  airline,
  aircraftModel,
  isRemote,
  times,
  onChange,
  errors,
  disabled = false,
}) => {
  const fields = getTimeFieldsForAirline(airline, isRemote);
  const durationMinutes = getTurnaroundDuration(airline, aircraftModel);
  const cleaningMins = getCleaningMinutes(airline, aircraftModel);

  // Show dock2 if it has a value or user clicked +
  const [showDock2, setShowDock2] = useState(!!times.dock2);

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
          <CountdownTimer chocksOnTime={times.chocksOnArrival} lastHandBagTime={times.lastHandBag} durationMinutes={durationMinutes} cleaningMinutes={cleaningMins} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {fields.map((field) => {
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
                        onChange={(e) => updateTime(textKey, e.target.value)}
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
              return (
                <React.Fragment key={field.key}>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {field.label}
                      </label>
                      {!showDock2 && !times.dock2 && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          onClick={() => setShowDock2(true)}
                          disabled={disabled}
                          className="h-6 w-6 shrink-0"
                          title="Añadir 2ª Muelle"
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
                  {(showDock2 || times.dock2) && (
                    <TimeInput
                      key="dock2"
                      label="2ª Muelle"
                      value={times.dock2 as string | null}
                      onChange={(v) => updateTime('dock2', v)}
                      error={getError('dock2')}
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
