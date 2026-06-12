import React from 'react';
import { AirlineCode, AIRLINES, getAirlinePrefix } from '@/types/turnaround';
import { useAllAirlines } from '@/hooks/useCatalog';
import { getModelsForAirline } from '@/data/aircraftModels';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Calendar as CalendarIcon, ArrowRight, X, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { TimeInput } from './TimeInput';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useFlightLookup } from '@/hooks/useFlightLookup';
import { toast } from 'sonner';
import { ParkingRefreshButton } from './ParkingRefreshButton';

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
  const allAirlines = useAllAirlines();
  const models = airline ? getModelsForAirline(airline) : [];

  const activePrefix = getAirlinePrefix(airline);
  // Whether the field is in "prefixed numeric" mode
  const isPrefixedMode = airline !== '';

  // Check if both flights have real content (not just prefix) and are equal
  const hasRealArrivalContent = isPrefixedMode
    ? flightNumber.length > activePrefix.length
    : flightNumber.trim().length > 0;
  const hasRealDepartureContent = isPrefixedMode
    ? departureFlightNumber.length > activePrefix.length
    : departureFlightNumber.trim().length > 0;
  const hasFlightConflict = hasRealArrivalContent && hasRealDepartureContent && flightNumber === departureFlightNumber;

  // Flight lookup hooks — independent for arrival and departure
  const arrivalLookup = useFlightLookup(flightNumber);
  const departureLookup = useFlightLookup(departureFlightNumber);
  const lookupLoading = arrivalLookup.isLoading;
  const lookupError = arrivalLookup.error;
  const departureLookupLoading = departureLookup.isLoading;
  const arrivalNotFound = arrivalLookup.notFound;
  const departureNotFound = departureLookup.notFound;

  // Success-flash state (green check next to field for ~2s)
  const [successFlash, setSuccessFlash] = React.useState<Set<string>>(new Set());
  const [parkingFlash, setParkingFlash] = React.useState(false);
  const [remoteFlash, setRemoteFlash] = React.useState(false);
  const flashParking = React.useCallback(() => {
    setParkingFlash(true);
    setTimeout(() => setParkingFlash(false), 2000);
  }, []);
  const flashRemote = React.useCallback(() => {
    setRemoteFlash(true);
    setTimeout(() => setRemoteFlash(false), 2000);
  }, []);

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

  const applyLookupResult = React.useCallback((lookupResult: typeof arrivalLookup.result) => {
    if (!lookupResult) return;

    const filled = new Set<string>();

    // Airline → only fill if currently empty
    if (lookupResult.airlineCode && !airline) {
      setAirline(lookupResult.airlineCode);
      filled.add('airline');
    }

    // Resolve aircraft model → only fill if currently empty
    const targetAirline = lookupResult.airlineCode || (airline as AirlineCode);
    const currentModels = targetAirline ? getModelsForAirline(targetAirline) : [];

    if (lookupResult.aircraftModel && !aircraftModel) {
      const iataCode = lookupResult.aircraftModel.toUpperCase();
      const mappedModel = IATA_TO_MODEL[iataCode];
      const match = currentModels.find(
        (m) => m.model === mappedModel ||
               m.model.toLowerCase() === iataCode.toLowerCase() ||
               m.label.toLowerCase() === iataCode.toLowerCase() ||
               m.model.toUpperCase().includes(iataCode) ||
               iataCode.includes(m.model.toUpperCase())
      );
      if (match) {
        setAircraftModel(match.model);
        filled.add('aircraftModel');
      }
    }

    // Matrícula → only fill if currently empty
    if (lookupResult.registration && !matricula) {
      setMatricula(lookupResult.registration.toUpperCase());
      filled.add('matricula');
    }

    // ARION extras: parking → tango (only if empty), edt → departureTime (only if empty)
    if (lookupResult.parkingCode && !tango && !isRemote) {
      setTango(lookupResult.parkingCode.toUpperCase().slice(0, 4));
      filled.add('tango');
    }
    if (lookupResult.edtHHmm && !departureTime) {
      setDepartureTime(lookupResult.edtHHmm);
      filled.add('departureTime');
    }

    if (filled.size > 0) {
      setAutofilledFields((prev) => new Set([...prev, ...filled]));
      setSuccessFlash(filled);
      toast('Datos del vuelo completados automáticamente', { duration: 2000 });
      setTimeout(() => setSuccessFlash(new Set()), 2000);
    }
  }, [airline, aircraftModel, matricula, tango, isRemote, departureTime, setAirline, setAircraftModel, setMatricula, setTango, setDepartureTime]);


  // Track last applied keys to avoid re-applying on every render
  const lastAppliedArrivalRef = React.useRef<string | null>(null);
  const lastAppliedDepartureRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (arrivalLookup.result && lastAppliedArrivalRef.current !== flightNumber) {
      lastAppliedArrivalRef.current = flightNumber;
      applyLookupResult(arrivalLookup.result);
    }
  }, [arrivalLookup.result, flightNumber, applyLookupResult]);

  React.useEffect(() => {
    if (departureLookup.result && lastAppliedDepartureRef.current !== departureFlightNumber) {
      lastAppliedDepartureRef.current = departureFlightNumber;
      applyLookupResult(departureLookup.result);
    }
  }, [departureLookup.result, departureFlightNumber, applyLookupResult]);



  // Clear autofill markers when user manually edits a field
  const clearAutofillFor = (field: string) => {
    setAutofilledFields((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  };

  const [showModelError, setShowModelError] = React.useState(false);
  const canContinue = (soloSalida || flightNumber.trim() !== '') && airline !== '' && aircraftModel !== '';

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
    const oldPrefix = getAirlinePrefix(airline);
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
    const newPrefix = getAirlinePrefix(v);
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
                {allAirlines.map((a) => (
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
                Vuelo de llegada {!soloSalida && <span className="text-destructive">*</span>}
              </Label>
                <div className="relative flex items-center">
                  {isPrefixedMode && (
                    <span className={cn(
                      "absolute left-3 text-sm font-mono font-semibold z-10 pointer-events-none",
                      soloSalida ? "text-muted-foreground/50" : "text-primary"
                    )}>
                      {activePrefix}
                    </span>
                  )}
                  <Input
                    type="text"
                    inputMode={isPrefixedMode ? 'numeric' : 'text'}
                    value={isPrefixedMode ? flightNumber.slice(activePrefix.length) : flightNumber}
                    onChange={(e) => handleFlightNumberChange(isPrefixedMode ? activePrefix + e.target.value : e.target.value)}
                    placeholder={isPrefixedMode ? '1234' : 'Ej: TP1234'}
                    disabled={soloSalida}
                    className={cn("input-operational font-mono pr-8", isPrefixedMode && "pl-[calc(0.75rem+var(--prefix-width,1.5ch))]", soloSalida && "opacity-50 cursor-not-allowed")}
                    style={isPrefixedMode ? { paddingLeft: `${12 + activePrefix.length * 9}px` } : undefined}
                  />
                  {lookupLoading && !soloSalida && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {!lookupLoading && successFlash.size > 0 && !soloSalida && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                  )}
                </div>
              {lookupError && !soloSalida && (
                <p className="text-xs text-destructive mt-1">{lookupError}</p>
              )}
              {arrivalNotFound && !soloSalida && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Vuelo no encontrado — rellena los datos manualmente
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className={cn(
                "text-xs uppercase tracking-wide",
                hasFlightConflict
                  ? "text-destructive font-bold"
                  : "text-muted-foreground"
              )}>
                Vuelo de salida
                {hasFlightConflict && (
                  <span className="ml-1 animate-pulse">⚠</span>
                )}
              </Label>
              <div className="relative flex items-center">
                {isPrefixedMode && (
                  <span className={cn(
                    "absolute left-3 text-sm font-mono font-semibold z-10 pointer-events-none",
                    hasFlightConflict
                      ? "text-destructive"
                      : "text-primary"
                  )}>
                    {activePrefix}
                  </span>
                )}
                <Input
                  type="text"
                  inputMode={isPrefixedMode ? 'numeric' : 'text'}
                  value={isPrefixedMode ? departureFlightNumber.slice(activePrefix.length) : departureFlightNumber}
                  onChange={(e) => handleDepartureFlightNumberChange(isPrefixedMode ? activePrefix + e.target.value : e.target.value)}
                  placeholder={isPrefixedMode ? '1234' : 'Ej: TP1234'}
                  className={cn(
                    "input-operational font-mono pr-8",
                    isPrefixedMode && "pl-[calc(0.75rem+var(--prefix-width,1.5ch))]",
                    hasFlightConflict && "blink-required"
                  )}
                  style={isPrefixedMode ? { paddingLeft: `${12 + activePrefix.length * 9}px` } : undefined}
                />
                {departureLookupLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!departureLookupLoading && successFlash.size > 0 && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                )}
              </div>
              {hasFlightConflict && (
                <div
                  className="rounded-md p-2 text-[11px] font-bold text-black leading-tight border-2 border-destructive"
                  style={{ backgroundColor: '#FFFF00' }}
                >
                  No puede ser igual al vuelo de llegada
                </div>
              )}
              {departureNotFound && !hasFlightConflict && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Vuelo no encontrado — rellena los datos manualmente
                </p>
              )}
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                        Ubicación Remoto
                      </Label>
                      <ParkingRefreshButton
                        flightNumber={flightNumber}
                        currentValue={remoteLocation}
                        onUpdate={setRemoteLocation}
                        onFlash={flashRemote}
                      />
                    </div>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={remoteLocation}
                      onChange={(e) => setRemoteLocation(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="Ej: 1"
                      className={cn(
                        "input-operational font-mono transition-all",
                        remoteFlash && "ring-2 ring-green-500"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Modelo de Avión <span className="text-destructive">*</span>
                      {autofilledFields.has('aircraftModel') && (
                        <span className="ml-2 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">AUTO</span>
                      )}
                    </Label>
                    <Select value={aircraftModel} onValueChange={(v) => { clearAutofillFor('aircraftModel'); setAircraftModel(v); }}>
                      <SelectTrigger
                        className={cn(
                          "input-operational",
                          autofilledFields.has('aircraftModel') && "ring-1 ring-primary/40 bg-primary/5",
                          showModelError && !aircraftModel && "blink-required"
                        )}
                      >
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Tango
                    </Label>
                    <ParkingRefreshButton
                      flightNumber={flightNumber}
                      currentValue={tango}
                      onUpdate={setTango}
                      onFlash={flashParking}
                    />
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={tango}
                    onChange={(e) => setTango(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Tango"
                    className={cn(
                      "input-operational font-mono transition-all",
                      parkingFlash && "ring-2 ring-green-500"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Modelo de Avión <span className="text-destructive">*</span>
                    {autofilledFields.has('aircraftModel') && (
                      <span className="ml-2 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">AUTO</span>
                    )}
                  </Label>
                  <Select value={aircraftModel} onValueChange={(v) => { clearAutofillFor('aircraftModel'); setAircraftModel(v); }}>
                    <SelectTrigger
                      className={cn(
                        "input-operational",
                        autofilledFields.has('aircraftModel') && "ring-1 ring-primary/40 bg-primary/5",
                        showModelError && !aircraftModel && "blink-required"
                      )}
                    >
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
            )}

            {showModelError && !aircraftModel && (
              <div className="mt-1 flex items-start gap-1.5 rounded-md border border-destructive bg-destructive/10 p-1.5 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p className="text-[11px] font-semibold leading-tight">
                  Debes elegir un modelo de aeronave para continuar.
                </p>
              </div>
            )}

            {/* Sólo Llegada + Sólo Salida en una misma línea */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
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

              <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
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
            disabled={(!soloSalida && flightNumber.trim() === '') || airline === ''}
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
