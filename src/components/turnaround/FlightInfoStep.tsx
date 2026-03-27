import React from 'react';
import { AirlineCode, AIRLINES } from '@/types/turnaround';
import { getModelsForAirline } from '@/data/aircraftModels';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Calendar as CalendarIcon, ArrowRight, X, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { TimeInput } from './TimeInput';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useFlightLookup } from '@/hooks/useFlightLookup';

interface FlightInfoStepProps {
  flightNumber: string;
  setFlightNumber: (v: string) => void;
  tango: string;
  setTango: (v: string) => void;
  isRemote: boolean;
  setIsRemote: (v: boolean) => void;
  remoteLocation: string;
  setRemoteLocation: (v: string) => void;
  pushBack: boolean;
  setPushBack: (v: boolean) => void;
  date: Date;
  setDate: (v: Date) => void;
  airline: AirlineCode | '';
  setAirline: (v: AirlineCode) => void;
  aircraftModel: string;
  setAircraftModel: (v: string) => void;
  matricula: string;
  setMatricula: (v: string) => void;
  soloLlegada: boolean;
  setSoloLlegada: (v: boolean) => void;
  soloSalida: boolean;
  setSoloSalida: (v: boolean) => void;
  departureTime: string | null;
  setDepartureTime: (v: string | null) => void;
  isEditing?: boolean;
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
  pushBack,
  setPushBack,
  date,
  setDate,
  airline,
  setAirline,
  aircraftModel,
  setAircraftModel,
  matricula,
  setMatricula,
  soloLlegada,
  setSoloLlegada,
  soloSalida,
  setSoloSalida,
  departureTime,
  setDepartureTime,
  isEditing = false,
  onContinue,
  onCancel,
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [autofilledFields, setAutofilledFields] = React.useState<Set<string>>(new Set());
  const models = airline ? getModelsForAirline(airline) : [];

  // Prefix map kept for reference but no longer forced into input
  const AIRLINE_PREFIXES: Record<AirlineCode, string> = {
    FEDEX: '3V',
    AIR_CANADA: 'AC',
    TRANSAVIA: 'TO',
    WIZZ: 'W',
    TAP: 'TP',
    ITA: 'AZ0',
    NILE_AIR: 'NP',
    AEGEAN: 'A',
    PEGASUS: 'PC',
    SKYEXPRESS: 'GQ',
    AMAZON: 'ABR',
    A_JET: 'VF',
    ALBASTAR: 'AP',
    ICELANDAIR: 'FI',
    AZUL: 'AD',
    SIN_MARCA: 'SM',
  };

  // Flight lookup hook
  const { isLoading: lookupLoading, error: lookupError, result: lookupResult } = useFlightLookup(flightNumber);

  // Apply autofill when result changes
  const lastAppliedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!lookupResult || lastAppliedRef.current === flightNumber) return;
    lastAppliedRef.current = flightNumber;

    const filled = new Set<string>();

    if (lookupResult.airlineCode) {
      setAirline(lookupResult.airlineCode);
      const newModels = getModelsForAirline(lookupResult.airlineCode);
      if (newModels.length === 1) setAircraftModel(newModels[0].model);
      filled.add('airline');
    }

    if (lookupResult.aircraftModel) {
      // Try to match the IATA code to our model list
      const currentModels = lookupResult.airlineCode ? getModelsForAirline(lookupResult.airlineCode) : models;
      const match = currentModels.find(
        (m) => m.model.toLowerCase() === lookupResult.aircraftModel!.toLowerCase() ||
               m.label.toLowerCase() === lookupResult.aircraftModel!.toLowerCase()
      );
      if (match) {
        setAircraftModel(match.model);
        filled.add('aircraftModel');
      }
    }

    if (lookupResult.registration) {
      setMatricula(lookupResult.registration.toUpperCase());
      filled.add('matricula');
    }

    setAutofilledFields(filled);
  }, [lookupResult]);

  // Clear autofill markers when user manually edits a field
  const clearAutofillFor = (field: string) => {
    setAutofilledFields((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  };

  // Extract numeric part from flightNumber (strip any existing prefix)
  const getNumericPart = (fn: string): string => {
    if (!currentPrefix) return fn.replace(/\D/g, '');
    if (fn.startsWith(currentPrefix)) return fn.slice(currentPrefix.length);
    return fn.replace(/\D/g, '');
  };

  const canContinue = flightNumber.trim() !== '' && airline !== '';

  const handleAirlineChange = (v: AirlineCode) => {
    setAirline(v);
    const newModels = getModelsForAirline(v);
    setAircraftModel(newModels.length === 1 ? newModels[0].model : '');
    // Update flight number with new prefix
    const prefix = AIRLINE_PREFIXES[v] || '';
    const numPart = flightNumber.replace(/^[A-Z]*/i, '');
    setFlightNumber(prefix + numPart.replace(/\D/g, ''));
  };

  const handleFlightNumberChange = (digits: string) => {
    const cleanDigits = digits.replace(/\D/g, '');
    setFlightNumber(currentPrefix + cleanDigits);
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
          {/* Airline — FIRST */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Aerolínea <span className="text-destructive">*</span>
              {autofilledFields.has('airline') && (
                <span className="ml-2 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">AUTO</span>
              )}
            </Label>
            <Select value={airline || undefined} onValueChange={(v) => { clearAutofillFor('airline'); handleAirlineChange(v as AirlineCode); }}>
              <SelectTrigger className={cn("input-operational", autofilledFields.has('airline') && "ring-1 ring-primary/40 bg-primary/5")}>
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

          {/* Flight Number + Aircraft Model side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Número de Vuelo <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                {currentPrefix && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-foreground pointer-events-none">
                    {currentPrefix}
                  </span>
                )}
                <Input
                  type="text"
                  inputMode="numeric"
                  value={getNumericPart(flightNumber)}
                  onChange={(e) => handleFlightNumberChange(e.target.value)}
                  placeholder="Nº vuelo"
                  className="input-operational font-mono pr-8"
                  style={currentPrefix ? { paddingLeft: `${currentPrefix.length * 0.65 + 0.75}rem` } : undefined}
                />
                {lookupLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {lookupError && (
                <p className="text-xs text-destructive mt-1">{lookupError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Modelo de Avión
                {autofilledFields.has('aircraftModel') && (
                  <span className="ml-2 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">AUTO</span>
                )}
              </Label>
              <Select value={aircraftModel} onValueChange={(v) => { clearAutofillFor('aircraftModel'); setAircraftModel(v); }}>
                <SelectTrigger className={cn("input-operational", autofilledFields.has('aircraftModel') && "ring-1 ring-primary/40 bg-primary/5")}>
                  <SelectValue placeholder="Modelo" />
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
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Ubicación Remoto
                  </Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={remoteLocation}
                    onChange={(e) => setRemoteLocation(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej: 1, 2..."
                    className="input-operational font-mono"
                  />
                </div>

                {/* Push Back toggle — only when remote */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Push Back
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={pushBack}
                      onCheckedChange={setPushBack}
                      className="data-[state=checked]:bg-warning"
                    />
                    <span className={cn(
                      'text-sm font-semibold',
                      pushBack ? 'text-warning' : 'text-muted-foreground'
                    )}>
                      {pushBack ? 'Sí' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Tango
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={tango}
                  onChange={(e) => setTango(e.target.value.replace(/\D/g, ''))}
                  placeholder="Tango"
                  className="input-operational font-mono"
                />
              </div>
            )}

            {/* Sólo llegada toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Sólo Llegada
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={soloLlegada}
                  onCheckedChange={(v) => {
                    setSoloLlegada(v);
                    if (v) setSoloSalida(false);
                  }}
                  className="data-[state=checked]:bg-primary"
                />
                <span className={cn(
                  'text-sm font-semibold',
                  soloLlegada ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {soloLlegada ? 'Sí' : 'No'}
                </span>
              </div>
            </div>

            {/* Sólo salida toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Sólo Salida
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={soloSalida}
                  onCheckedChange={(v) => {
                    setSoloSalida(v);
                    if (v) setSoloLlegada(false);
                  }}
                  className="data-[state=checked]:bg-primary"
                />
                <span className={cn(
                  'text-sm font-semibold',
                  soloSalida ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {soloSalida ? 'Sí' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Date — only visible when editing an existing turnaround */}
          {isEditing && (
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
          )}

          {/* Airline and Aircraft Model already rendered above */}

          {/* Matrícula + Hora Salida side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Matrícula
                {autofilledFields.has('matricula') && (
                  <span className="ml-2 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">AUTO</span>
                )}
              </Label>
              <Input
                value={matricula}
                onChange={(e) => { clearAutofillFor('matricula'); setMatricula(e.target.value.toUpperCase()); }}
                placeholder="Matrícula"
                className={cn("input-operational font-mono", autofilledFields.has('matricula') && "ring-1 ring-primary/40 bg-primary/5")}
              />
            </div>
            <TimeInput
              label="Hora Salida"
              value={departureTime}
              onChange={setDepartureTime}
            />
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
