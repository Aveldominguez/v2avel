import React from 'react';
import { TurnaroundTimes, TimeValidationError } from '@/types/turnaround';
import { TimeInput } from './TimeInput';
import { BooleanInput } from './BooleanInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Clock } from 'lucide-react';

interface GeneralTimesBlockProps {
  times: TurnaroundTimes;
  onChange: (times: TurnaroundTimes) => void;
  errors: TimeValidationError[];
  disabled?: boolean;
}

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

          {/* Llegada Jardinera */}
          <TimeInput
            label="Llegada Jardinera"
            value={times.busArrival}
            onChange={(v) => updateTime('busArrival', v)}
            error={getError('busArrival')}
            disabled={disabled}
          />

          {/* Última Jardinera */}
          <TimeInput
            label="Última Jardinera"
            value={times.lastBus}
            onChange={(v) => updateTime('lastBus', v)}
            error={getError('lastBus')}
            disabled={disabled}
          />

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
            clockColor="red"
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
