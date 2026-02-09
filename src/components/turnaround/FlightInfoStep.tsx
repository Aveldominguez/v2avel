import React from 'react';
import { AirlineCode, AIRLINES } from '@/types/turnaround';
import { getModelsForAirline } from '@/data/aircraftModels';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Calendar as CalendarIcon, ArrowRight, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FlightInfoStepProps {
  flightNumber: string;
  setFlightNumber: (v: string) => void;
  tango: string;
  setTango: (v: string) => void;
  isRemote: boolean;
  setIsRemote: (v: boolean) => void;
  remoteLocation: string;
  setRemoteLocation: (v: string) => void;
  date: Date;
  setDate: (v: Date) => void;
  airline: AirlineCode | '';
  setAirline: (v: AirlineCode) => void;
  aircraftModel: string;
  setAircraftModel: (v: string) => void;
  onContinue: () => void;
  onCancel: () => void;
}

export const FlightInfoStep: React.FC<FlightInfoStepProps> = ({
  flightNumber,
  setFlightNumber,
  tango,
  setTango,
  isRemote,
  setIsRemote,
  remoteLocation,
  setRemoteLocation,
  date,
  setDate,
  airline,
  setAirline,
  aircraftModel,
  setAircraftModel,
  onContinue,
  onCancel,
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const models = airline ? getModelsForAirline(airline) : [];

  const canContinue = flightNumber.trim() !== '' && airline !== '' && aircraftModel;

  const handleAirlineChange = (v: AirlineCode) => {
    setAirline(v);
    // Reset model when airline changes
    const newModels = getModelsForAirline(v);
    setAircraftModel(newModels.length === 1 ? newModels[0].model : '');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="card-operational w-full max-w-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/20">
                <Plane className="h-6 w-6 text-primary" />
              </div>
              Nueva Escala
            </CardTitle>
            <Button variant="destructive" size="sm" onClick={onCancel} className="gap-1.5">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Flight Number */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Número de Vuelo <span className="text-destructive">*</span>
            </Label>
            <Input
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
              placeholder="Introducir vuelo"
              className="input-operational font-mono"
            />
          </div>

          {/* Tango / Remote toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                En Remoto
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={isRemote}
                  onCheckedChange={setIsRemote}
                  className="data-[state=checked]:bg-warning"
                />
                <span className={cn(
                  'text-sm font-semibold',
                  isRemote ? 'text-warning' : 'text-muted-foreground'
                )}>
                  {isRemote ? 'Sí' : 'No'}
                </span>
              </div>
            </div>

            {isRemote ? (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Ubicación Remoto
                </Label>
                <Input
                  value={remoteLocation}
                  onChange={(e) => setRemoteLocation(e.target.value.toUpperCase())}
                  placeholder="Ej: R1, R2..."
                  className="input-operational font-mono"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Tango
                </Label>
                <Input
                  value={tango}
                  onChange={(e) => setTango(e.target.value.toUpperCase())}
                  placeholder="Tango"
                  className="input-operational font-mono"
                />
              </div>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Fecha del Vuelo
            </Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'input-operational w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {date ? format(date, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    if (d) {
                      setDate(d);
                      setIsCalendarOpen(false);
                    }
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Airline */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Aerolínea <span className="text-destructive">*</span>
            </Label>
            <Select value={airline || undefined} onValueChange={(v) => handleAirlineChange(v as AirlineCode)}>
              <SelectTrigger className="input-operational">
                <SelectValue placeholder="Seleccionar Aerolínea" />
              </SelectTrigger>
              <SelectContent>
                {AIRLINES.map((a) => (
                  <SelectItem key={a.code} value={a.code}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aircraft Model */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Modelo de Aeronave <span className="text-destructive">*</span>
            </Label>
            <Select value={aircraftModel} onValueChange={setAircraftModel}>
              <SelectTrigger className="input-operational">
                <SelectValue placeholder="Seleccionar modelo" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.model} value={m.model}>
                    {m.label} — {m.turnaroundMinutes} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Continue */}
          <Button
            onClick={onContinue}
            disabled={!canContinue}
            className="w-full gap-2 h-12 text-lg font-semibold"
            size="lg"
          >
            Continuar con el vuelo
            <ArrowRight className="h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
