import React from 'react';
import { AirlineCode, AIRLINES } from '@/types/turnaround';
import { getModelsForAirline } from '@/data/aircraftModels';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Calendar as CalendarIcon, ArrowRight, X, Loader2, AlertTriangle } from 'lucide-react';
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
  departureFlightNumber: string;
  setDepartureFlightNumber: (v: string) => void;
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
  departureFlightNumber,
  setDepartureFlightNumber,
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
    EUROWINGS: 'EW',
    CROATIA: 'OU',
    SIN_MARCA: 'SM',
  };

  const activePrefix = airline ? AIRLINE_PREFIXES[airline] : '';
  // Whether the field is in "prefixed numeric" mode
  const isPrefixedMode = airline !== '';

  // Flight lookup hook
  const { isLoading: lookupLoading, error: lookupError, result: lookupResult } = useFlightLookup(flightNumber);

  // IATA aircraft type codes to our internal model names
  const IATA_TO_MODEL: Record<string, string> = {
    '32B': 'A321', '321': 'A321', '32Q': 'A321', 'A21N': 'A321', 'A321': 'A321',
    '320': 'A320', '32A': 'A320', '32N': 'A320', 'A20N': 'A320', 'A320': 'A320',
    '319': 'A319', 'A319': 'A319',
    '223': 'A220', '22B': 'A220', 'BCS3': 'A220', 'BCS1': 'A220', 'A220': 'A220',
    '738': '737-800', '73H': '737-800', 'B738': '737-800',
    '73G': 'B737', '737': 'B737', '73W': 'B737', 'B737': 'B737',
    '734': 'B734', 'B734': 'B734',
    '333': 'A333', 'A333': 'A333',
    '339': 'A339', 'A339': 'A339',
    '767': 'B767', '763': 'B767', '76W': 'B767', 'B763': 'B767', 'B767': 'B767',
    '777': 'B777', '77W': 'B777', '772': 'B777', 'B777': 'B777', 'B772': 'B777',
    '788': '787-800', 'B788': '787-800', '789': '787-900', 'B789': '787-900',
    'E90': 'EMB90', 'E190': 'EMB90', 'E95': 'EMB95', 'E195': 'EMB95', 'E290': 'EMB90', 'E295': 'EMB95',
  };

  // Apply autofill when result changes
  const lastAppliedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!lookupResult || lastAppliedRef.current === flightNumber) return;
    lastAppliedRef.current = flightNumber;

    const filled = new Set<string>();

    if (lookupResult.airlineCode) {
      setAirline(lookupResult.airlineCode);
      filled.add('airline');
    }

    // Resolve aircraft model using IATA code mapping
    const targetAirline = lookupResult.airlineCode || (airline as AirlineCode);
    const currentModels = targetAirline ? getModelsForAirline(targetAirline) : [];

    if (lookupResult.aircraftModel) {
      const iataCode = lookupResult.aircraftModel.toUpperCase();
      const mappedModel = IATA_TO_MODEL[iataCode];

      // Try mapped name first, then direct match
      const match = currentModels.find(
        (m) => m.model === mappedModel ||
               m.model.toLowerCase() === iataCode.toLowerCase() ||
               m.label.toLowerCase() === iataCode.toLowerCase()
      );
      if (match) {
        setAircraftModel(match.model);
        filled.add('aircraftModel');
      }
    }

    // If airline was set and only one model exists, auto-select it
    if (!filled.has('aircraftModel') && currentModels.length === 1) {
      setAircraftModel(currentModels[0].model);
      filled.add('aircraftModel');
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

  const [showModelError, setShowModelError] = React.useState(false);
  const canContinue = flightNumber.trim() !== '' && airline !== '' && aircraftModel !== '';

  // Clear error once a model is chosen
  React.useEffect(() => {
    if (aircraftModel) setShowModelError(false);
  }, [aircraftModel]);

  const handleContinueClick = () => {
    if (!aircraftModel) {
      setShowModelError(true);
      return;
    }
    onContinue();
  };

  const handleAirlineChange = (v: AirlineCode) => {
    // Strip old prefix from flight number if present
    const oldPrefix = airline ? AIRLINE_PREFIXES[airline as AirlineCode] : '';
    let numericPart = flightNumber;
    if (oldPrefix && numericPart.startsWith(oldPrefix)) {
      numericPart = numericPart.slice(oldPrefix.length);
    }
    // Remove any non-digit characters from the numeric part
    numericPart = numericPart.replace(/\D/g, '');

    // Same for departure flight number
    let depNumericPart = departureFlightNumber;
    if (oldPrefix && depNumericPart.startsWith(oldPrefix)) {
      depNumericPart = depNumericPart.slice(oldPrefix.length);
    }
    depNumericPart = depNumericPart.replace(/\D/g, '');

    setAirline(v);
    const newPrefix = AIRLINE_PREFIXES[v];
    setFlightNumber(newPrefix + numericPart);
    setDepartureFlightNumber(newPrefix + depNumericPart);

    const newModels = getModelsForAirline(v);
    setAircraftModel(newModels.length === 1 ? newModels[0].model : '');
  };

  const handleFlightNumberChange = (value: string) => {
    if (isPrefixedMode) {
      // Only allow digits after the prefix
      const digits = value.slice(activePrefix.length).replace(/\D/g, '');
      setFlightNumber(activePrefix + digits);
    } else {
      setFlightNumber(value.toUpperCase());
    }
  };

  const handleDepartureFlightNumberChange = (value: string) => {
    if (isPrefixedMode) {
      const digits = value.slice(activePrefix.length).replace(/\D/g, '');
      setDepartureFlightNumber(activePrefix + digits);
    } else {
      setDepartureFlightNumber(value.toUpperCase());
    }
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

          {/* Vuelo de llegada + Vuelo de salida */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Vuelo de llegada <span className="text-destructive">*</span>
              </Label>
                <div className="relative flex items-center">
                  {isPrefixedMode && (
                    <span className="absolute left-3 text-sm font-mono font-semibold text-primary z-10 pointer-events-none">
                      {activePrefix}
                    </span>
                  )}
                  <Input
                    type="text"
                    inputMode={isPrefixedMode ? 'numeric' : 'text'}
                    value={isPrefixedMode ? flightNumber.slice(activePrefix.length) : flightNumber}
                    onChange={(e) => handleFlightNumberChange(isPrefixedMode ? activePrefix + e.target.value : e.target.value)}
                    placeholder={isPrefixedMode ? '1234' : 'Ej: TP1234'}
                    className={cn("input-operational font-mono pr-8", isPrefixedMode && "pl-[calc(0.75rem+var(--prefix-width,1.5ch))]")}
                    style={isPrefixedMode ? { paddingLeft: `${12 + activePrefix.length * 9}px` } : undefined}
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
                Vuelo de salida
              </Label>
              <div className="relative flex items-center">
                {isPrefixedMode && (
                  <span className="absolute left-3 text-sm font-mono font-semibold text-primary z-10 pointer-events-none">
                    {activePrefix}
                  </span>
                )}
                <Input
                  type="text"
                  inputMode={isPrefixedMode ? 'numeric' : 'text'}
                  value={isPrefixedMode ? departureFlightNumber.slice(activePrefix.length) : departureFlightNumber}
                  onChange={(e) => handleDepartureFlightNumberChange(isPrefixedMode ? activePrefix + e.target.value : e.target.value)}
                  placeholder={isPrefixedMode ? '1234' : 'Ej: TP1234'}
                  className={cn("input-operational font-mono", isPrefixedMode && "pl-[calc(0.75rem+var(--prefix-width,1.5ch))]")}
                  style={isPrefixedMode ? { paddingLeft: `${12 + activePrefix.length * 9}px` } : undefined}
                />
              </div>
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
              {(() => {
                const normalized = matricula.replace(/[-\s]/g, '').toUpperCase();
                if (normalized === 'EIIMN') {
                  return (
                    <div className="mt-2 flex items-start gap-2 rounded-md border-2 border-destructive bg-destructive/10 p-2 text-destructive">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold leading-tight">
                        ⚠️ AVISO: Esta aeronave (EI-IMN) tiene problemas en 2 bodegas del compartimento trasero.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <TimeInput
              label="Hora Salida"
              value={departureTime}
              onChange={setDepartureTime}
            />
          </div>

          {/* Continue */}
          <Button
            onClick={handleContinueClick}
            disabled={flightNumber.trim() === '' || airline === ''}
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
