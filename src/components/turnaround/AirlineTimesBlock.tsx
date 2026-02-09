import React from 'react';
import { TurnaroundTimes, TimeValidationError, AirlineCode, getTimeFieldsForAirline } from '@/types/turnaround';
import { getTurnaroundDuration, getCleaningMinutes } from '@/data/aircraftModels';
import { TimeInput } from './TimeInput';
import { BooleanInput } from './BooleanInput';
import { CountdownTimer } from './CountdownTimer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
              // The text field key is derived: asu -> asuData
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
