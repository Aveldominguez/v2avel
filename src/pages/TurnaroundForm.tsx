import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TurnaroundTimes, AirlineCode, FieldValue, TimeValidationError, AIRLINES } from '@/types/turnaround';
import { validateTimes, formatDateTime } from '@/utils/timeValidation';
import { useTurnarounds } from '@/hooks/useTurnarounds';
import { useOfflineSync, saveDraft, loadDraft, clearDraft, TurnaroundDraft } from '@/hooks/useOfflineSync';
import { getEmptyTimes } from '@/hooks/useTurnaroundStore';
import { FlightInfoStep } from '@/components/turnaround/FlightInfoStep';
import { AirlineTimesBlock } from '@/components/turnaround/AirlineTimesBlock';
import { AirlineTabs } from '@/components/turnaround/AirlineTabs';
import { ConnectionStatus } from '@/components/turnaround/ConnectionStatus';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Clock, AlertTriangle, Loader2, FileText, Plane } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const AUTOSAVE_DELAY = 3000; // 3 seconds debounce

const TurnaroundForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const { createTurnaround, updateTurnaround, getTurnaroundById } = useTurnarounds();
  const { isOnline, syncing, pendingCount, enqueue } = useOfflineSync();

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

  // Auto-save refs
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUnsavedChanges = useRef(false);
  const isInitialLoad = useRef(true);

  // Load data on mount — from server or draft
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (id) {
        setLoading(true);
        // Try loading from draft first (offline edits)
        const draft = loadDraft(id);
        const existing = await getTurnaroundById(id);
        
        if (isMounted) {
          // Use draft if it's newer than server data
          if (draft && existing && draft.savedAt > existing.updatedAt.getTime()) {
            applyDraft(draft);
          } else if (existing) {
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
          } else if (draft) {
            applyDraft(draft);
          } else {
            toast({ title: 'Error', description: 'No se encontró la escala', variant: 'destructive' });
            navigate('/');
          }
          setLoading(false);
          // Mark initial load complete after a tick
          setTimeout(() => { isInitialLoad.current = false; }, 500);
        }
      } else {
        // New turnaround — check for draft
        const draft = loadDraft();
        if (draft) {
          applyDraft(draft);
          toast({ title: 'Borrador recuperado', description: 'Se ha restaurado tu trabajo anterior' });
        }
        isInitialLoad.current = false;
      }
    };
    loadData();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const applyDraft = (draft: TurnaroundDraft) => {
    setFlightNumber(draft.flightNumber);
    setDate(new Date(draft.date));
    setAirline(draft.airline);
    setTimes(draft.times);
    setTango(draft.tango);
    setIsRemote(draft.isRemote);
    setRemoteLocation(draft.remoteLocation);
    setFieldValues(draft.fieldValues);
    setObservations(draft.observations);
    setStep(draft.step);
  };

  useEffect(() => {
    setErrors(validateTimes(times));
  }, [times]);

  const getTimesWithFlightInfo = useCallback((): TurnaroundTimes => ({
    ...times,
    tango: isRemote ? null : (tango || null),
    isRemote,
    remoteLocation: isRemote ? (remoteLocation || null) : null,
  }), [times, tango, isRemote, remoteLocation]);

  // --- Auto-save: save draft to localStorage on any change ---
  useEffect(() => {
    if (isInitialLoad.current) return;
    hasUnsavedChanges.current = true;

    // Always save draft locally immediately
    const draft: TurnaroundDraft = {
      turnaroundId: id,
      flightNumber,
      date: date.toISOString(),
      airline,
      times: getTimesWithFlightInfo(),
      fieldValues,
      observations,
      tango,
      isRemote,
      remoteLocation,
      step,
      savedAt: Date.now(),
    };
    saveDraft(draft);

    // Debounced server save (only in step 2, editing mode, online)
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    
    if (isEditing && step === 2) {
      autoSaveTimer.current = setTimeout(() => {
        autoSaveToServer();
      }, AUTOSAVE_DELAY);
    }

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightNumber, date, airline, times, fieldValues, observations, tango, isRemote, remoteLocation]);

  const autoSaveToServer = useCallback(async () => {
    if (!isEditing || !id || !flightNumber.trim()) return;
    
    const finalTimes = getTimesWithFlightInfo();
    const fieldValuesForDb = fieldValues.map(fv => ({
      fieldDefinitionId: fv.fieldDefinitionId,
      value: fv.value,
      updatedAt: fv.updatedAt.toISOString(),
      updatedBy: fv.updatedBy,
    }));

    if (isOnline) {
      try {
        await updateTurnaround(id, flightNumber, date, airline, finalTimes, fieldValues, observations);
        setLastSaved(new Date());
        hasUnsavedChanges.current = false;
        clearDraft(id);
      } catch (err) {
        console.warn('Auto-save to server failed, queuing offline:', err);
        enqueue({
          type: 'update',
          turnaroundId: id,
          data: {
            flightNumber,
            date: date.toISOString().split('T')[0],
            airline,
            times: finalTimes,
            fieldValues: fieldValuesForDb,
            observations,
          },
        });
      }
    } else {
      // Offline: enqueue for later sync
      enqueue({
        type: 'update',
        turnaroundId: id,
        data: {
          flightNumber,
          date: date.toISOString().split('T')[0],
          airline,
          times: finalTimes,
          fieldValues: fieldValuesForDb,
          observations,
        },
      });
      setLastSaved(new Date());
      hasUnsavedChanges.current = false;
    }
  }, [id, flightNumber, date, airline, fieldValues, observations, isEditing, isOnline, getTimesWithFlightInfo, updateTurnaround, enqueue]);

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
    const fieldValuesForDb = fieldValues.map(fv => ({
      fieldDefinitionId: fv.fieldDefinitionId,
      value: fv.value,
      updatedAt: fv.updatedAt.toISOString(),
      updatedBy: fv.updatedBy,
    }));

    if (isOnline) {
      try {
        if (isEditing && id) {
          await updateTurnaround(id, flightNumber, date, airline, finalTimes, fieldValues, observations);
          setLastSaved(new Date());
          clearDraft(id);
          toast({ title: 'Escala actualizada', description: `Vuelo ${flightNumber} guardado correctamente` });
        } else {
          await createTurnaround(flightNumber, date, airline, finalTimes, fieldValues, observations);
          clearDraft();
          toast({ title: 'Escala creada', description: `Vuelo ${flightNumber} guardado correctamente` });
          navigate('/');
        }
      } catch (err) {
        console.error('Error saving:', err);
        // Fallback to offline queue
        enqueue({
          type: isEditing ? 'update' : 'create',
          turnaroundId: id,
          data: {
            flightNumber,
            date: date.toISOString().split('T')[0],
            airline,
            times: finalTimes,
            fieldValues: fieldValuesForDb,
            observations,
          },
        });
        toast({ title: 'Guardado localmente', description: 'Se sincronizará cuando haya conexión' });
        if (!isEditing) navigate('/');
      }
    } else {
      // Offline: queue the operation
      enqueue({
        type: isEditing ? 'update' : 'create',
        turnaroundId: id,
        data: {
          flightNumber,
          date: date.toISOString().split('T')[0],
          airline,
          times: finalTimes,
          fieldValues: fieldValuesForDb,
          observations,
        },
      });
      toast({ title: 'Guardado localmente', description: 'Se sincronizará cuando recuperes la conexión' });
      if (!isEditing) {
        clearDraft();
        navigate('/');
      } else {
        setLastSaved(new Date());
        clearDraft(id);
      }
    }
    setSaving(false);
  }, [flightNumber, date, airline, fieldValues, observations, isEditing, id, navigate, createTurnaround, updateTurnaround, getTimesWithFlightInfo, isOnline, enqueue]);

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

            <div className="flex items-center gap-3">
              <ConnectionStatus
                isOnline={isOnline}
                syncing={syncing}
                pendingCount={pendingCount}
                lastSaved={lastSaved}
              />
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
        <AirlineTimesBlock
          airline={airline}
          isRemote={isRemote}
          times={times}
          onChange={setTimes}
          errors={errors}
        />

        {airline !== 'FEDEX' && (
          <AirlineTabs
            airline={airline}
            fieldValues={fieldValues}
            onChange={setFieldValues}
          />
        )}

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
