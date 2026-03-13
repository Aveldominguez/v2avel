import React, { useState } from 'react';
import { TurnaroundTimes, TimeValidationError } from '@/types/turnaround';
import { TimeInput } from './TimeInput';
import { BooleanInput } from './BooleanInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plane, Clock, Plus } from 'lucide-react';

interface GeneralTimesBlockProps {
  times: TurnaroundTimes;
  onChange: (times: TurnaroundTimes) => void;
  errors: TimeValidationError[];
  disabled?: boolean;
}

const BUS_KEYS: (keyof TurnaroundTimes)[] = ['busArrival', 'bus2', 'bus3', 'bus4', 'bus5', 'bus6'];
const getBusLabel = (index: number) => `${index + 1}ª Jardinera`;

const DynamicJardineraFields: React.FC<{
  times: TurnaroundTimes;
  updateTime: (field: keyof TurnaroundTimes, value: string | null | boolean) => void;
  getError: (field: string) => string | undefined;
  disabled: boolean;
}> = ({ times, updateTime, getError, disabled }) => {
  const existingCount = BUS_KEYS.filter(k => times[k]).length;
  const [visibleCount, setVisibleCount] = useState(Math.max(1, existingCount));
  const canAddMore = visibleCount < BUS_KEYS.length;

  return (
    <>
      {BUS_KEYS.slice(0, visibleCount).map((key, idx) => (
        <div key={key} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {getBusLabel(idx)}
            </label>
            {idx === visibleCount - 1 && canAddMore && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => setVisibleCount(v => v + 1)}
                disabled={disabled}
                className="h-6 w-6 shrink-0"
                title={`Añadir ${getBusLabel(visibleCount)}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <TimeInput
            label=""
            value={times[key] as string | null}
            onChange={(v) => updateTime(key, v)}
            error={getError(String(key))}
            disabled={disabled}
            hideLabel
          />
        </div>
      ))}
    </>
  );
};

export const GeneralTimesBlock: React.FC<GeneralTimesBlockProps> = ({
  times,
  onChange,
  errors,
  disabled = false,
}) => {
  const updateTime = (field: keyof TurnaroundTimes, value: string | null | boolean) => {
    onChange({ ...times, [field]: value });
  };

  const getError = (field: string): string | undefined => {
    return errors.find(e => e.field === field)?.message;
  };

  return (
    <Card className="card-operational">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 rounded-lg bg-primary/20">
            <Plane className="h-6 w-6 text-primary" />
          </div>
          <span>Control de Hora Escala Rampa</span>
          <Clock className="h-5 w-5 text-muted-foreground ml-auto" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* 1 - Calzos Llegada */}
          <TimeInput
            label="Calzos Llegada"
            value={times.chocksOnArrival}
            onChange={(v) => updateTime('chocksOnArrival', v)}
            error={getError('chocksOnArrival')}
            disabled={disabled}
            clockColor="green"
          />

          {/* 2 - Recepción de LIR */}
          <TimeInput
            label="Recepción de LIR"
            value={times.lirReception}
            onChange={(v) => updateTime('lirReception', v)}
            error={getError('lirReception')}
            disabled={disabled}
          />

          {/* 3 - Inicio Descarga */}
          <TimeInput
            label="Inicio Descarga"
            value={times.unloadingStart}
            onChange={(v) => updateTime('unloadingStart', v)}
            error={getError('unloadingStart')}
            disabled={disabled}
            clockColor="green"
          />

          {/* 4 - Inicio Carga */}
          <TimeInput
            label="Inicio Carga"
            value={times.loadingStart}
            onChange={(v) => updateTime('loadingStart', v)}
            error={getError('loadingStart')}
            disabled={disabled}
            clockColor="red"
          />

          {/* 5 - Fin Descarga */}
          <TimeInput
            label="Fin Descarga"
            value={times.unloadingEnd}
            onChange={(v) => updateTime('unloadingEnd', v)}
            error={getError('unloadingEnd')}
            disabled={disabled}
            clockColor="green"
          />

          {/* 6 - Fin Carga */}
          <TimeInput
            label="Fin Carga"
            value={times.loadingEnd}
            onChange={(v) => updateTime('loadingEnd', v)}
            error={getError('loadingEnd')}
            disabled={disabled}
            clockColor="red"
          />

          {/* 7 - Puesta Escalera */}
          <TimeInput
            label="Puesta Escalera"
            value={times.stairsTime}
            onChange={(v) => updateTime('stairsTime', v)}
            error={getError('stairsTime')}
            disabled={disabled}
            clockColor="green"
          />

          {/* 8 - Retirada Escalera */}
          <TimeInput
            label="Retirada Escalera"
            value={times.specialEndLoading}
            onChange={(v) => updateTime('specialEndLoading', v)}
            error={getError('specialEndLoading')}
            disabled={disabled}
            clockColor="red"
          />

          {/* 9 - 1ª Maleta */}
          <TimeInput
            label="1ª Maleta"
            value={times.firstBag}
            onChange={(v) => updateTime('firstBag', v)}
            error={getError('firstBag')}
            disabled={disabled}
            clockColor="green"
          />

          {/* 10 - Calzos Salida */}
          <TimeInput
            label="Calzos Salida"
            value={times.chocksOff}
            onChange={(v) => updateTime('chocksOff', v)}
            error={getError('chocksOff')}
            disabled={disabled}
            clockColor="red"
          />

          {/* Jardineras dinámicas */}
          <DynamicJardineraFields times={times} updateTime={updateTime} getError={getError} disabled={disabled} />

          {/* Cargo booleans */}
          <BooleanInput
            label="Cargo Llegada"
            value={times.cargoArrival}
            onChange={(v) => updateTime('cargoArrival', v)}
            disabled={disabled}
          />

          <BooleanInput
            label="Cargo Salida"
            value={times.cargoDeparture}
            onChange={(v) => updateTime('cargoDeparture', v)}
            disabled={disabled}
          />

          {/* Puesta de GPU */}
          <TimeInput
            label="Puesta de GPU"
            value={times.gpuOn}
            onChange={(v) => updateTime('gpuOn', v)}
            error={getError('gpuOn')}
            disabled={disabled}
          />

          {/* Retirada de GPU */}
          <TimeInput
            label="Retirada de GPU"
            value={times.gpuOff}
            onChange={(v) => updateTime('gpuOff', v)}
            error={getError('gpuOff')}
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  );
};
