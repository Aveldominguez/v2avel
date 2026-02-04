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
          {/* Tiempo de llegada */}
          <TimeInput
            label="Calzos Llegada"
            value={times.chocksOnArrival}
            onChange={(v) => updateTime('chocksOnArrival', v)}
            error={getError('chocksOnArrival')}
            disabled={disabled}
          />
          
          <TimeInput
            label="Puesta Escalera"
            value={times.stairsTime}
            onChange={(v) => updateTime('stairsTime', v)}
            error={getError('stairsTime')}
            disabled={disabled}
          />

          {/* Descarga */}
          <TimeInput
            label="Inicio Descarga"
            value={times.unloadingStart}
            onChange={(v) => updateTime('unloadingStart', v)}
            error={getError('unloadingStart')}
            disabled={disabled}
          />
          
          <TimeInput
            label="Fin Descarga"
            value={times.unloadingEnd}
            onChange={(v) => updateTime('unloadingEnd', v)}
            error={getError('unloadingEnd')}
            disabled={disabled}
          />

          {/* Carga */}
          <TimeInput
            label="Inicio Carga"
            value={times.loadingStart}
            onChange={(v) => updateTime('loadingStart', v)}
            error={getError('loadingStart')}
            disabled={disabled}
          />
          
          <TimeInput
            label="Fin Carga"
            value={times.loadingEnd}
            onChange={(v) => updateTime('loadingEnd', v)}
            error={getError('loadingEnd')}
            disabled={disabled}
          />

          {/* Fin carga especial */}
          <TimeInput
            label="Retirada Escalera"
            value={times.specialEndLoading}
            onChange={(v) => updateTime('specialEndLoading', v)}
            error={getError('specialEndLoading')}
            disabled={disabled}
          />

          {/* Salida */}
          <TimeInput
            label="Calzos Salida"
            value={times.chocksOff}
            onChange={(v) => updateTime('chocksOff', v)}
            error={getError('chocksOff')}
            disabled={disabled}
          />

          {/* Jardinera */}
          <TimeInput
            label="Llegada Jardinera"
            value={times.busArrival}
            onChange={(v) => updateTime('busArrival', v)}
            error={getError('busArrival')}
            disabled={disabled}
          />
          
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
        </div>
      </CardContent>
    </Card>
  );
};
