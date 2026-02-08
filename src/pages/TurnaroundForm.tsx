import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TurnaroundTimes, AirlineCode, FieldValue, TimeValidationError, AIRLINES } from '@/types/turnaround';
import { validateTimes, formatDateTime, formatDate } from '@/utils/timeValidation';
import { useTurnarounds } from '@/hooks/useTurnarounds';
import { getEmptyTimes } from '@/hooks/useTurnaroundStore';
import { FlightInfoStep } from '@/components/turnaround/FlightInfoStep';
import { AirlineTimesBlock } from '@/components/turnaround/AirlineTimesBlock';
import { AirlineTabs } from '@/components/turnaround/AirlineTabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Clock, AlertTriangle, Loader2, FileText, Plane } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TurnaroundForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const { createTurnaround, updateTurnaround, getTurnaroundById } = useTurnarounds();

  // Step management: 1 = flight info, 2 = operational
  const [step, setStep] = useState(isEditing ? 2 : 1);

  const [flightNumber, setFlightNumber] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [airline, setAirline] = useState<AirlineCode>('TAP');
  const [tango, setTango] = useState('');
  const [isRemote, setIsRemote] = useState(false);
  const [remoteLocation, setRemoteLocation] = useState('');
  const [times, setTimes] = useState<TurnaroundTimes>(getEmptyTimes());
  const [fieldValues, setFieldValues] = useState<FieldValue[]>([]);
  const [observations, setObservations] = useState('');
  const [errors, setErrors] = useState<TimeValidationError[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Load data on mount for editing
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (id) {
        setLoading(true);
        const existing = await getTurnaroundById(id);
        if (isMounted) {
          if (existing) {
            setFlightNumber(existing.flightNumber);
            setDate(existing.date);
            setAirline(existing.airline);
            setTimes(existing.times);
            setTango(existing.times.tango || '');
            setIsRemote(existing.times.isRemote || false);
            setRemoteLocation(existing.times.remoteLocation || '');
            setFieldValues(existing.fieldValues);
            setObservations(existing.observations || '');
            setLastSaved(existing.updatedAt);
          } else {
            toast({ title: 'Error', description: 'No se encontró la escala', variant: 'destructive' });
            navigate('/');
          }
          setLoading(false);
        }
      }
    };
    loadData();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    setErrors(validateTimes(times));
  }, [times]);

  // Sync tango/remote into times
  const getTimesWithFlightInfo = useCallback((): TurnaroundTimes => ({
    ...times,
    tango: isRemote ? null : (tango || null),
    isRemote,
    remoteLocation: isRemote ? (remoteLocation || null) : null,
  }), [times, tango, isRemote, remoteLocation]);

  const handleContinue = () => {
    if (!flightNumber.trim()) {
      toast({ title: 'Campo requerido', description: 'Ingrese el número de vuelo', variant: 'destructive' });
      return;
    }
    setStep(2);
  };

  const handleSave = useCallback(async () => {
    if (!flightNumber.trim()) {
      toast({ title: 'Campo requerido', description: 'Ingrese el número de vuelo', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const finalTimes = getTimesWithFlightInfo();

    try {
      if (isEditing && id) {
        await updateTurnaround(id, flightNumber, date, airline, finalTimes, fieldValues, observations);
        setLastSaved(new Date());
        toast({ title: 'Escala actualizada', description: `Vuelo ${flightNumber} guardado correctamente` });
      } else {
        await createTurnaround(flightNumber, date, airline, finalTimes, fieldValues, observations);
        toast({ title: 'Escala creada', description: `Vuelo ${flightNumber} guardado correctamente` });
        navigate('/');
      }
    } catch (err) {
      console.error('Error saving:', err);
      toast({ title: 'Error', description: 'No se pudo guardar la escala', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [flightNumber, date, airline, fieldValues, observations, isEditing, id, navigate, createTurnaround, updateTurnaround, getTimesWithFlightInfo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Step 1: Flight info
  if (step === 1) {
    return (
      <FlightInfoStep
        flightNumber={flightNumber}
        setFlightNumber={setFlightNumber}
        tango={tango}
        setTango={setTango}
        isRemote={isRemote}
        setIsRemote={setIsRemote}
        remoteLocation={remoteLocation}
        setRemoteLocation={setRemoteLocation}
        date={date}
        setDate={setDate}
        airline={airline}
        setAirline={setAirline}
        onContinue={handleContinue}
      />
    );
  }

  // Step 2: Operational
  const airlineInfo = AIRLINES.find(a => a.code === airline);

  return (
    <div className="min-h-screen bg-background">
      {/* Header with flight info summary */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b-2 border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {!isEditing && (
                <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Volver atrás</span>
                </Button>
              )}
              {isEditing && (
                <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <Plane className="h-4 w-4 text-primary" />
                  <span className="font-mono font-bold text-lg">{flightNumber}</span>
                </div>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">{airlineInfo?.name}</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">{format(date, 'dd/MM/yyyy', { locale: es })}</span>
                {isRemote && remoteLocation && (
                  <>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-warning font-semibold">Remoto: {remoteLocation}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {lastSaved && (
                <p className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(lastSaved)}
                </p>
              )}
              {errors.length > 0 && (
                <div className="hidden sm:flex items-center gap-2 text-warning text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{errors.length}</span>
                </div>
              )}
              <Button onClick={handleSave} size="lg" className="gap-2" disabled={saving}>
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                <span className="hidden sm:inline">Guardar</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Control de Horas */}
        <AirlineTimesBlock
          airline={airline}
          isRemote={isRemote}
          times={times}
          onChange={setTimes}
          errors={errors}
        />

        {/* Carga de SALIDA - Hidden for FedEx */}
        {airline !== 'FEDEX' && (
          <AirlineTabs
            airline={airline}
            fieldValues={fieldValues}
            onChange={setFieldValues}
          />
        )}

        {/* Observaciones */}
        <Card className="card-operational">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              Observaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Ingrese cualquier observación relevante sobre esta escala..."
              className="min-h-[120px] resize-y"
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TurnaroundForm;
