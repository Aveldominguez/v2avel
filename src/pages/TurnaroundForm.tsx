import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { TurnaroundTimes, AirlineCode, FieldValue, TimeValidationError, AIRLINES } from '@/types/turnaround';
import { getModelsForAirline } from '@/data/aircraftModels';
import { validateTimes, formatDateTime } from '@/utils/timeValidation';
import { useTurnarounds } from '@/hooks/useTurnarounds';
import { useOfflineSync, saveDraft, loadDraft, clearDraft, TurnaroundDraft } from '@/hooks/useOfflineSync';
import { getEmptyTimes } from '@/hooks/useTurnaroundStore';
import { FlightInfoStep } from '@/components/turnaround/FlightInfoStep';
import { AirlineTimesBlock } from '@/components/turnaround/AirlineTimesBlock';
import { AirlineTabs } from '@/components/turnaround/AirlineTabs';
import { ConnectionStatus } from '@/components/turnaround/ConnectionStatus';
import { LoadingSheetField } from '@/components/turnaround/LoadingSheetField';
import { FileUploadField } from '@/components/turnaround/FileUploadField';
import { ObservationPhotos } from '@/components/turnaround/ObservationPhotos';
import EquipmentSection from '@/components/turnaround/EquipmentSection';
import BodegasSection from '@/components/turnaround/BodegasSection';
import { EquipmentSelection } from '@/data/equipmentDefinitions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Clock, AlertTriangle, Loader2, FileText, Plane, Pencil, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { ThemeToggle } from '@/components/ThemeToggle';
import { getImpersonatedUser, clearImpersonatedUser } from '@/utils/adminImpersonation';
import { LogOut as ExitUserIcon, UserCircle2 } from 'lucide-react';
import { IncidentReportDialog, type IncidentReportData } from '@/components/turnaround/IncidentReportDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AUTOSAVE_DELAY = 3000; // 3 seconds debounce

const TurnaroundForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const { createTurnaround, updateTurnaround, getTurnaroundById } = useTurnarounds();
  const { isOnline, syncing, pendingCount, enqueue } = useOfflineSync();
  const { updateAvailable } = useAppUpdate();

  const [step, setStep] = useState(isEditing ? 2 : 1);
  const [flightNumber, setFlightNumber] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [airline, setAirline] = useState<AirlineCode | ''>('');
  // Safe cast for step 2+ where airline is guaranteed to be set
  const selectedAirline = airline as AirlineCode;
  const [tango, setTango] = useState('');
  const [isRemote, setIsRemote] = useState(false);
  const [aircraftModel, setAircraftModel] = useState('');
  const [remoteLocation, setRemoteLocation] = useState('');
  const [matricula, setMatricula] = useState('');
  const [soloLlegada, setSoloLlegada] = useState(false);
  const [soloSalida, setSoloSalida] = useState(false);
  const [pushBack, setPushBack] = useState(false);
  const [departureTime, setDepartureTime] = useState<string | null>(null);
  const [departureFlightNumber, setDepartureFlightNumber] = useState('');
  const [times, setTimes] = useState<TurnaroundTimes>(getEmptyTimes());
  const [fieldValues, setFieldValues] = useState<FieldValue[]>([]);
  const [observations, setObservations] = useState('');
  const [loadingSheetUrls, setLoadingSheetUrls] = useState<string[]>([]);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [observationPhotos, setObservationPhotos] = useState<string[]>([]);
  const [incidentReport, setIncidentReport] = useState<IncidentReportData | null>(null);
  const [equipmentSelections, setEquipmentSelections] = useState<EquipmentSelection[]>([]);
  const [bodegasData, setBodegasData] = useState<{ f1: string; f2: string; f3: string; a1: string; a2: string; a3: string }>({ f1: '', f2: '', f3: '', a1: '', a2: '', a3: '' });
  const [errors, setErrors] = useState<TimeValidationError[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [originStation, setOriginStation] = useState<string | null>(null);
  const [destStation, setDestStation] = useState<string | null>(null);
  const [homeStation, setHomeStation] = useState<string | null>(null);
  const [ldmRaw, setLdmRaw] = useState<string | null>(null);
  const [airlineLogo, setAirlineLogo] = useState<string | null>(null);


  // Fetch origin (arrival source) + home station + departure dest from ARION
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!flightNumber.trim() && !departureFlightNumber.trim()) {
        setOriginStation(null); setDestStation(null); setHomeStation(null); setLdmRaw(null); setAirlineLogo(null); return;
      }
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const dateStr = `${date.getFullYear()}-${mm}-${dd}`;
        const numbers = [flightNumber.trim(), departureFlightNumber.trim()].filter(Boolean);
        if (numbers.length === 0) return;
        const { data } = await supabase
          .from('scheduled_flights')
          .select('flight_number, movement_type, source_station, home_station, ldm_raw, airline_logo')
          .in('flight_number', numbers)
          .eq('flight_date', dateStr);
        if (cancelled || !data) return;
        const arrival = data.find((r: any) => r.flight_number === flightNumber.trim() && r.movement_type === 'A');
        const departure = data.find((r: any) => r.flight_number === departureFlightNumber.trim() && r.movement_type === 'D');
        setOriginStation((arrival as any)?.source_station ?? null);
        setDestStation((departure as any)?.source_station ?? null);
        setHomeStation(((arrival as any)?.home_station ?? (departure as any)?.home_station) ?? null);
        setLdmRaw((arrival as any)?.ldm_raw ?? null);
        setAirlineLogo(((arrival as any)?.airline_logo ?? (departure as any)?.airline_logo) ?? null);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [flightNumber, departureFlightNumber, date]);



  // Auto-save refs
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUnsavedChanges = useRef(false);
  const isInitialLoad = useRef(true);
  const savedAndNavigating = useRef(false);

  // Load data on mount — from server or draft
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (id) {
        setLoading(true);
        // Try loading from draft first (offline edits)
        const draft = loadDraft(id);
        let existing = null;
        try {
          existing = await getTurnaroundById(id);
        } catch (err) {
          console.warn('Failed to fetch from server, will use draft if available:', err);
        }
        
        if (isMounted) {
          // Use draft if it's newer than server data, or if server is unavailable
          if (draft && (!existing || draft.savedAt > existing.updatedAt.getTime())) {
            applyDraft(draft);
          } else if (existing) {
            setFlightNumber(existing.flightNumber);
            setDate(existing.date);
            setAirline(existing.airline);
            setTimes(existing.times);
            setTango(existing.times.tango || '');
            setIsRemote(existing.times.isRemote || false);
            setRemoteLocation(existing.times.remoteLocation || '');
            setAircraftModel(existing.times.aircraftModel || '');
            setMatricula(existing.times.matricula || '');
            setSoloLlegada(existing.times.soloLlegada || false);
            setSoloSalida(existing.times.soloSalida || false);
            setPushBack(existing.times.pushBack || false);
            setDepartureTime(existing.times.departureTime || null);
            setDepartureFlightNumber(existing.times.departureFlightNumber || '');
            setFieldValues(existing.fieldValues);
            setObservations(existing.observations || '');
            // Backward compat: migrate loadingSheetUrl to loadingSheetUrls
            const existingLsUrls = existing.times.loadingSheetUrls || [];
            if (existingLsUrls.length === 0 && existing.times.loadingSheetUrl) {
              setLoadingSheetUrls([existing.times.loadingSheetUrl]);
            } else {
              setLoadingSheetUrls(existingLsUrls);
            }
            // Backward compat: migrate fileUrl to fileUrls
            const existingFileUrls = existing.times.fileUrls || [];
            if (existingFileUrls.length === 0 && existing.times.fileUrl) {
              setFileUrls([existing.times.fileUrl]);
            } else {
              setFileUrls(existingFileUrls);
            }
            setObservationPhotos(existing.times.observationPhotos || []);
            setIncidentReport(existing.times.incidentReport || null);
            setEquipmentSelections(existing.times.equipment || []);
            setBodegasData(existing.times.bodegasData || { f1: '', f2: '', f3: '', a1: '', a2: '', a3: '' });
            setLastSaved(existing.updatedAt);
          } else if (draft) {
            applyDraft(draft);
            toast({ title: '📱 Sin conexión', description: 'Cargado desde borrador local' });
          } else {
            toast({ title: 'Error', description: 'No se encontró la escala', variant: 'destructive' });
            navigate('/');
          }
          setLoading(false);
          // Mark initial load complete after a tick
          setTimeout(() => { isInitialLoad.current = false; }, 500);
        }
      } else {
        // New turnaround — always start fresh
        clearDraft();
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
    setAircraftModel(draft.aircraftModel || '');
    setMatricula(draft.matricula || '');
    setSoloLlegada(draft.soloLlegada || false);
    setSoloSalida(draft.soloSalida || false);
    setPushBack(draft.times?.pushBack || false);
    setDepartureTime(draft.times?.departureTime || null);
    setDepartureFlightNumber(draft.times?.departureFlightNumber || '');
    setTimes(draft.times);
    setTango(draft.tango);
    setIsRemote(draft.isRemote);
    setRemoteLocation(draft.remoteLocation);
    setFieldValues(draft.fieldValues);
    setObservations(draft.observations);
    setStep(draft.step);
    // Restore fields stored inside times that have separate state
    if (draft.times) {
      const t = draft.times;
      const lsUrls = t.loadingSheetUrls || [];
      setLoadingSheetUrls(lsUrls.length === 0 && t.loadingSheetUrl ? [t.loadingSheetUrl] : lsUrls);
      const fUrls = t.fileUrls || [];
      setFileUrls(fUrls.length === 0 && t.fileUrl ? [t.fileUrl] : fUrls);
      setObservationPhotos(t.observationPhotos || []);
      setIncidentReport(t.incidentReport || null);
      setEquipmentSelections(t.equipment || []);
      setBodegasData(t.bodegasData || { f1: '', f2: '', f3: '', a1: '', a2: '', a3: '' });
    }
  };

  useEffect(() => {
    setErrors(validateTimes(times));
  }, [times]);

  const getTimesWithFlightInfo = useCallback((): TurnaroundTimes => ({
    ...times,
    tango: isRemote ? null : (tango || null),
    isRemote,
    remoteLocation: isRemote ? (remoteLocation || null) : null,
    aircraftModel: aircraftModel || null,
    matricula: matricula || null,
    soloLlegada,
    soloSalida,
    pushBack,
    departureTime,
    departureFlightNumber: departureFlightNumber || null,
    loadingSheetUrl: loadingSheetUrls[0] || null,
    loadingSheetUrls,
    fileUrl: fileUrls[0] || null,
    fileUrls,
    observationPhotos,
    incidentReport,
    equipment: equipmentSelections,
    bodegasData,
  }), [times, tango, isRemote, remoteLocation, aircraftModel, matricula, soloLlegada, soloSalida, pushBack, departureTime, departureFlightNumber, loadingSheetUrls, fileUrls, observationPhotos, incidentReport, equipmentSelections, bodegasData]);

  // --- Build current draft snapshot ---
  const buildDraft = useCallback((): TurnaroundDraft => ({
    turnaroundId: id,
    flightNumber,
    date: date.toISOString(),
    airline: selectedAirline,
    aircraftModel,
    times: getTimesWithFlightInfo(),
    fieldValues,
    observations,
    tango,
    matricula,
    isRemote,
    soloLlegada,
    soloSalida,
    remoteLocation,
    step,
    savedAt: Date.now(),
  }), [id, flightNumber, date, selectedAirline, aircraftModel, getTimesWithFlightInfo, fieldValues, observations, tango, matricula, isRemote, soloLlegada, soloSalida, remoteLocation, step]);

  // --- Auto-save: save draft to localStorage on any change ---
  useEffect(() => {
    if (isInitialLoad.current || savedAndNavigating.current) return;
    hasUnsavedChanges.current = true;

    // Always save draft locally immediately
    saveDraft(buildDraft());

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
  }, [flightNumber, date, airline, aircraftModel, times, fieldValues, observations, tango, matricula, isRemote, remoteLocation, pushBack, departureTime, departureFlightNumber, loadingSheetUrls, fileUrls, observationPhotos, incidentReport, equipmentSelections, bodegasData]);

  // --- Lifecycle safety net: flush draft before iOS suspends/kills the WebView ---
  useEffect(() => {
    const flush = () => {
      if (isInitialLoad.current || savedAndNavigating.current) return;
      try { saveDraft(buildDraft()); } catch { /* ignore */ }
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [buildDraft]);

  const autoSaveToServer = useCallback(async () => {
    if (!isEditing || !id || !flightNumber.trim()) return;
    
    const finalTimes = getTimesWithFlightInfo();
    const safeDate = date instanceof Date ? date : new Date(date);
    const safeFvs: FieldValue[] = fieldValues.map(fv => ({
      ...fv,
      updatedAt: fv.updatedAt instanceof Date ? fv.updatedAt : new Date(fv.updatedAt),
    }));
    const fieldValuesForDb = safeFvs.map(fv => ({
      fieldDefinitionId: fv.fieldDefinitionId,
      value: fv.value,
      previousValue: fv.previousValue,
      nilSetAt: fv.nilSetAt,
      updatedAt: fv.updatedAt.toISOString(),
      updatedBy: fv.updatedBy,
    }));

    if (isOnline) {
      try {
        await updateTurnaround(id, flightNumber, safeDate, selectedAirline, finalTimes, safeFvs, observations.trim());
        setLastSaved(new Date());
        hasUnsavedChanges.current = false;
        // Don't clear draft on auto-save; keep as safety net until explicit manual save
      } catch (err) {
        console.warn('Auto-save to server failed, queuing offline:', err);
        enqueue({
          type: 'update',
          turnaroundId: id,
          data: {
            flightNumber,
            date: safeDate.toISOString().split('T')[0],
            airline: selectedAirline,
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
          date: safeDate.toISOString().split('T')[0],
          airline: selectedAirline,
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
    try {
      const finalTimes = getTimesWithFlightInfo();
      const safeDate = date instanceof Date ? date : new Date(date);
      const safeFvs: FieldValue[] = fieldValues.map(fv => ({
        ...fv,
        updatedAt: fv.updatedAt instanceof Date ? fv.updatedAt : new Date(fv.updatedAt),
      }));
      const fieldValuesForDb = safeFvs.map(fv => ({
        fieldDefinitionId: fv.fieldDefinitionId,
        value: fv.value,
        previousValue: fv.previousValue,
        nilSetAt: fv.nilSetAt,
        updatedAt: fv.updatedAt.toISOString(),
        updatedBy: fv.updatedBy,
      }));

      // Always write locally first (createTurnaround/updateTurnaround already do this).
      // Then, if offline OR server call fails, enqueue for background sync.
      try {
        if (isEditing && id) {
          await updateTurnaround(id, flightNumber, safeDate, selectedAirline, finalTimes, safeFvs, observations.trim());
          if (!isOnline) {
            enqueue({
              type: 'update',
              turnaroundId: id,
              data: {
                flightNumber,
                date: safeDate.toISOString().split('T')[0],
                airline: selectedAirline,
                times: finalTimes,
                fieldValues: fieldValuesForDb,
                observations,
              },
            });
            toast({ title: '📱 Guardado localmente', description: 'Se sincronizará al volver online' });
          } else {
            setLastSaved(new Date());
            clearDraft(id);
          }
        } else {
          const created = await createTurnaround(flightNumber, safeDate, selectedAirline, finalTimes, safeFvs, observations.trim());
          if (!isOnline && created) {
            enqueue({
              type: 'create',
              turnaroundId: created.id, // local UUID for remap on sync
              data: {
                flightNumber,
                date: safeDate.toISOString().split('T')[0],
                airline: selectedAirline,
                times: finalTimes,
                fieldValues: fieldValuesForDb,
                observations,
              },
            });
            toast({ title: '📱 Guardado localmente', description: 'Se sincronizará al volver online' });
          }
          clearDraft();
          savedAndNavigating.current = true;
          if (created) {
            navigate(`/turnaround/${created.id}`, { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }
      } catch (err) {
        console.error('Error saving:', err);
        // Network/RLS error — fall back to queue so nothing is lost.
        enqueue({
          type: isEditing ? 'update' : 'create',
          turnaroundId: id,
          data: {
            flightNumber,
            date: safeDate.toISOString().split('T')[0],
            airline: selectedAirline,
            times: finalTimes,
            fieldValues: fieldValuesForDb,
            observations,
          },
        });
        toast({ title: '📱 Guardado localmente', description: 'Se reintentará automáticamente' });
        if (!isEditing) {
          clearDraft();
          savedAndNavigating.current = true;
          navigate('/', { replace: true });
        }
      }
    } catch (err) {
      console.error('Unexpected error in handleSave:', err);
      toast({ title: 'Error', description: 'Error inesperado al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
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
        departureFlightNumber={departureFlightNumber}
        setDepartureFlightNumber={setDepartureFlightNumber}
        tango={tango}
        setTango={setTango}
        isRemote={isRemote}
        setIsRemote={setIsRemote}
        remoteLocation={remoteLocation}
        setRemoteLocation={setRemoteLocation}
        pushBack={pushBack}
        setPushBack={setPushBack}
        date={date}
        setDate={setDate}
        airline={airline}
        setAirline={setAirline}
        aircraftModel={aircraftModel}
        setAircraftModel={setAircraftModel}
        matricula={matricula}
        setMatricula={setMatricula}
        soloLlegada={soloLlegada}
        setSoloLlegada={setSoloLlegada}
        soloSalida={soloSalida}
        setSoloSalida={setSoloSalida}
        departureTime={departureTime}
        setDepartureTime={setDepartureTime}
        isEditing={isEditing}
        onContinue={handleContinue}
        onCancel={() => { clearDraft(); navigate('/'); }}
      />
    );
  }

  // Step 2: Operational
  const airlineInfo = AIRLINES.find(a => a.code === airline);

  const impersonated = getImpersonatedUser();
  const headerTopOffset = updateAvailable ? 40 : 0;
  const impersonationBarHeight = impersonated ? 36 : 0;

  return (
    <div className="min-h-screen bg-background">
      {impersonated && (
        <div
          className="sticky z-[60] bg-warning text-warning-foreground border-b-2 border-warning/60"
          style={{ top: headerTopOffset }}
        >
          <div className="container mx-auto px-4 py-1.5 flex items-center justify-between gap-2 text-xs sm:text-sm font-mono">
            <div className="flex items-center gap-2 min-w-0">
              <UserCircle2 className="h-4 w-4 shrink-0" />
              <span className="truncate">
                <span className="opacity-80 mr-1">Cuenta:</span>
                <span className="font-bold">{impersonated.email}</span>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 gap-1 bg-background/90 text-foreground hover:bg-background"
              onClick={() => { clearImpersonatedUser(); navigate('/admin'); }}
            >
              <ExitUserIcon className="h-3.5 w-3.5" />
              <span>Salir</span>
            </Button>
          </div>
        </div>
      )}
      <header
        className={cn("sticky z-50 bg-card/95 backdrop-blur border-b-2 border-border")}
        style={{ top: headerTopOffset + impersonationBarHeight }}
      >
        <div className="container mx-auto px-4 py-3 space-y-2">
          {/* Top row: back button + save */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {!isEditing && (
                <button
                  onClick={() => setStep(1)}
                  className="shrink-0 flex items-center justify-center h-10 w-10 rounded-lg border-2 bg-muted border-border text-foreground hover:bg-muted/80 transition-colors"
                  aria-label="Volver atrás"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              {isEditing && (
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              {airlineLogo && (
                <img
                  src={airlineLogo}
                  alt={airlineInfo?.name ?? 'Airline logo'}
                  className="h-8 w-auto max-w-[80px] object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStep(1)}
                className="shrink-0 text-muted-foreground hover:text-primary"
                title="Editar datos del vuelo"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <ThemeToggle />
              <ConnectionStatus
                isOnline={isOnline}
                syncing={syncing}
                pendingCount={pendingCount}
                lastSaved={lastSaved}
              />
              <Button onClick={handleSave} size="sm" className="gap-1.5" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Guardar</span>
              </Button>
            </div>
          </div>

          {/* Bottom row: flight details */}
          <div className="flex items-center justify-center gap-2 text-xs font-semibold flex-wrap">
            <span>{airlineInfo?.name}</span>
            <span>|</span>
            <span>{aircraftModel}</span>
            <span>|</span>
            <span>{format(date, 'dd/MM/yyyy', { locale: es })}</span>
            {isRemote && remoteLocation && (
              <>
                <span>|</span>
                <span className="text-warning">{remoteLocation}</span>
              </>
            )}
            {!isRemote && tango && (
              <>
                <span>|</span>
                <span>T{tango}</span>
              </>
            )}
            {matricula && (
              <>
                <span>|</span>
                <span>{matricula}</span>
              </>
            )}
            {errors.length > 0 && (
              <>
                <span>|</span>
                <span className="flex items-center gap-1 text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  {errors.length} aviso{errors.length > 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>

          {/* Flight route row: centered arrival/departure */}
          {(homeStation && (originStation || destStation)) && (
            <div className="flex items-center justify-center gap-3 text-xs font-semibold">
              {homeStation && originStation && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  ✈ {originStation} → {homeStation}
                </span>
              )}
              {homeStation && originStation && homeStation && destStation && (
                <span className="text-muted-foreground">|</span>
              )}
              {homeStation && destStation && (
                <span className="text-rose-600 dark:text-rose-400">
                  ✈ {homeStation} → {destStation}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="w-full px-2 sm:px-4 py-6 space-y-6">
        <AirlineTimesBlock
          airline={selectedAirline}
          aircraftModel={aircraftModel}
          isRemote={isRemote}
          soloLlegada={soloLlegada}
          soloSalida={soloSalida}
          times={{ ...times, pushBack, departureFlightNumber: departureFlightNumber || null } as any}
          onChange={(newTimes: any) => {
            const { departureFlightNumber: dfn, ...rest } = newTimes || {};
            if (dfn !== undefined && (dfn || '') !== departureFlightNumber) {
              setDepartureFlightNumber(dfn || '');
            }
            setTimes(rest);
          }}
          errors={errors}
          departureTime={departureTime}
          onDepartureTimeChange={setDepartureTime}
          flightNumber={flightNumber}
          ldmRaw={ldmRaw}
        />

        {(selectedAirline === 'FEDEX' || selectedAirline === 'AMAZON') && (
          <BodegasSection
            data={bodegasData}
            onChange={setBodegasData}
          />
        )}

        {selectedAirline !== 'FEDEX' && selectedAirline !== 'AMAZON' && !soloLlegada && (
          <AirlineTabs
            airline={selectedAirline}
            aircraftModel={aircraftModel}
            fieldValues={fieldValues}
            onChange={setFieldValues}
          />
        )}

        <EquipmentSection
          airline={selectedAirline}
          aircraftModel={aircraftModel || null}
          isRemote={isRemote}
          pushBack={pushBack}
          equipment={equipmentSelections}
          onChange={setEquipmentSelections}
        />

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 font-semibold bg-accent text-accent-foreground hover:bg-black hover:text-white active:bg-black active:text-white border-accent hover:border-black"
          onClick={async () => {
            const { generateTurnaroundPdf } = await import('@/utils/generateTurnaroundPdf');
            await generateTurnaroundPdf({
              flightNumber,
              date,
              airline: selectedAirline,
              aircraftModel,
              isRemote,
              remoteLocation,
              tango,
              times: getTimesWithFlightInfo(),
              fieldValues,
              observations,
            });
          }}
        >
          <FileDown className="h-4 w-4" />
          Exportar PDF
        </Button>

        {selectedAirline === 'WESTJET' && (
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/50 bg-amber-500/10 rounded-md p-3 leading-relaxed">
            En la LIR, hay que remarcar en círculo la matrícula del avión, la edición de la LIR y plasmar las iniciales de tu nombre en ambas marcas para afirmar la información.
          </div>
        )}

        {selectedAirline !== 'FEDEX' && !soloLlegada && (
          <LoadingSheetField
            turnaroundId={id}
            imageUrls={loadingSheetUrls}
            onChange={setLoadingSheetUrls}
          />
        )}

        <FileUploadField
          turnaroundId={id}
          fileUrls={fileUrls}
          onChange={setFileUrls}
        />

        <Card className="card-operational">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                Observaciones
              </div>
              <IncidentReportDialog
                flightNumber={flightNumber}
                date={date}
                parking={isRemote ? remoteLocation : tango ? `T${tango}` : '—'}
                reportData={incidentReport}
                onSave={setIncidentReport}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Ingrese cualquier observación relevante sobre esta escala..."
              className="min-h-[120px] resize-y"
            />
            <ObservationPhotos
              turnaroundId={id}
              photos={observationPhotos}
              onChange={setObservationPhotos}
            />
          </CardContent>
        </Card>
      </main>

    </div>
  );
};

export default TurnaroundForm;
