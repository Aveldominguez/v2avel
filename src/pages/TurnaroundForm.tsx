import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { TurnaroundTimes, AirlineCode, FieldValue, TimeValidationError, AIRLINES } from '@/types/turnaround';
import { getModelsForAirline } from '@/data/aircraftModels';
import { validateTimes, formatDateTime } from '@/utils/timeValidation';
import { useTurnarounds } from '@/hooks/useTurnarounds';
import { useOfflineSync, saveDraft, loadDraft, clearDraft, TurnaroundDraft } from '@/hooks/useOfflineSync';
import { useUploadsInFlight } from '@/hooks/useUploadsInFlight';
import { getEmptyTimes } from '@/hooks/useTurnaroundStore';
import { FlightInfoStep } from '@/components/turnaround/FlightInfoStep';
import { AirlineTimesBlock } from '@/components/turnaround/AirlineTimesBlock';
import { AirlineTabs } from '@/components/turnaround/AirlineTabs';
import { ConnectionStatus } from '@/components/turnaround/ConnectionStatus';
import { LoadingSheetField } from '@/components/turnaround/LoadingSheetField';
import AirCanadaCargoScanner from '@/components/turnaround/AirCanadaCargoScanner';
import { FileUploadField } from '@/components/turnaround/FileUploadField';
import { ObservationPhotos } from '@/components/turnaround/ObservationPhotos';
import { AttachmentRecovery } from '@/components/turnaround/AttachmentRecovery';
import { PdfExportDialog } from '@/components/turnaround/PdfExportDialog';
import EquipmentSection from '@/components/turnaround/EquipmentSection';
import BodegasSection from '@/components/turnaround/BodegasSection';
import { EquipmentSelection } from '@/data/equipmentDefinitions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Clock, AlertTriangle, Loader2, FileText, Plane, Pencil, FileDown, RefreshCw, Luggage } from 'lucide-react';
import { useArionSync } from '@/hooks/useArionSync';
import { fetchParkingFromArion } from '@/utils/arionParking';
import { isRemoteParking } from '@/types/turnaround';
import { decideParkingUpdate, isParkingLocked } from '@/utils/parkingLock';
import { formatBaggageBelt } from '@/utils/baggageBelt';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { WindAlertBadge } from '@/components/WindAlertBadge';
import { getImpersonatedUser, clearImpersonatedUser } from '@/utils/adminImpersonation';
import { LogOut as ExitUserIcon, UserCircle2 } from 'lucide-react';
import { IncidentReportDialog, type IncidentReportData } from '@/components/turnaround/IncidentReportDialog';
import { IssueReportButton } from '@/components/turnaround/IssueReportButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AUTOSAVE_DELAY = 3000; // 3 seconds debounce
// Retardo del borrador local: lo justo para no escribir en disco en cada tecla
// pero seguir siendo instantáneo a ojo del que apunta.
const DRAFT_DELAY = 800;

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
  // Parpadeo verde del botón Guardar al terminar bien: confirmación visual
  // inmediata, sin tener que leer el aviso flotante.
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashSaved = useCallback(() => {
    setSaveFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSaveFlash(false), 1200);
  }, []);
  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);
  const [showSaveFab, setShowSaveFab] = useState(false);

  useEffect(() => {
    const el = saveButtonRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowSaveFab(!entry.isIntersecting),
      { threshold: 0, rootMargin: '0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, step]);
  const [originStation, setOriginStation] = useState<string | null>(null);
  const [destStation, setDestStation] = useState<string | null>(null);
  const [homeStation, setHomeStation] = useState<string | null>(null);
  const [ldmRaw, setLdmRaw] = useState<string | null>(null);
  const [scheduledArrival, setScheduledArrival] = useState<string | null>(null);
  const [scheduledEta, setScheduledEta] = useState<string | null>(null);
  const [scheduledStd, setScheduledStd] = useState<string | null>(null);
  const [scheduledEtd, setScheduledEtd] = useState<string | null>(null);

  const [airlineLogo, setAirlineLogo] = useState<string | null>(null);
  // Sala y cinta de equipaje, tal cual las publica ARION ("N617").
  const [baggageBelt, setBaggageBelt] = useState<string | null>(null);


  // Fetch origin (arrival source) + home station + departure dest + STA/ETA/STD from ARION.
  // If ARION has no row we keep whatever we hydrated from the saved turnaround
  // so persisted info (origin/dest/home/LDM/logo) survives even if scheduled_flights is gone.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!flightNumber.trim() && !departureFlightNumber.trim()) {
        return;
      }
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const toIso = (d: Date) => {
          const mm2 = String(d.getMonth() + 1).padStart(2, '0');
          const dd2 = String(d.getDate()).padStart(2, '0');
          return `${d.getFullYear()}-${mm2}-${dd2}`;
        };
        const dateStr = toIso(date);
        const nextDay = new Date(date); nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = toIso(nextDay);
        const numbers = [flightNumber.trim(), departureFlightNumber.trim()].filter(Boolean);
        if (numbers.length === 0) return;

        // Normaliza un número de vuelo para comparar con ARION: quita espacios,
        // mayúsculas y elimina ceros a la izquierda de la parte numérica
        // ("AZ 059", "AZ059" y "AZ59" son el mismo vuelo).
        const normFn = (fn: string): string => {
          const clean = fn.replace(/\s+/g, '').toUpperCase();
          const m = clean.match(/^([A-Z]+)0*(\d+)$/);
          return m ? `${m[1]}${m[2]}` : clean;
        };

        // Variantes por número para el filtro del servidor (el matching fino se hace en cliente)
        const variants = new Set<string>();
        for (const n of numbers) {
          const clean = n.replace(/\s+/g, '').toUpperCase();
          variants.add(n);
          variants.add(clean);
          const m = clean.match(/^([A-Z]+)0*(\d+)$/);
          if (m) {
            variants.add(`${m[1]}${m[2]}`);
            variants.add(`${m[1]}0${m[2]}`);
            variants.add(`${m[1]}${m[2].padStart(3, '0')}`);
            variants.add(`${m[1]}${m[2].padStart(4, '0')}`);
          }
        }

        const SELECT_COLS = 'flight_number, movement_type, source_station, home_station, ldm_raw, airline_logo, sdt, edt, connection_sdt, flight_date, departure_fn, baggage_belt';
        const { data } = await supabase
          .from('scheduled_flights')
          .select(SELECT_COLS)
          .in('flight_number', Array.from(variants))
          .in('flight_date', [dateStr, nextDayStr]);
        if (cancelled || !data) return;

        // Preferir la fila del día del formulario; usar el día siguiente solo como fallback
        // (salidas que cruzan la medianoche).
        const pickByDate = (matches: any[]) =>
          matches.find((r: any) => r.flight_date === dateStr) ?? matches[0] ?? null;
        const findRow = (fn: string, movement: 'A' | 'D', rows: any[] = data) => {
          const target = normFn(fn);
          return pickByDate(rows.filter((r: any) =>
            r.movement_type === movement && normFn(String(r.flight_number ?? '')) === target
          ));
        };
        const arrival = findRow(flightNumber.trim(), 'A');
        let departure = findRow(departureFlightNumber.trim(), 'D');

        // Si la salida no aparece con el número que muestra el formulario, buscarla
        // por el `departure_fn` que la propia llegada trae de ARION: es el dato
        // exacto de la conexión y no depende de cómo compongamos el número aquí.
        const linkedDepFn = (arrival as any)?.departure_fn
          ? String((arrival as any).departure_fn).trim()
          : null;
        if (!departure && linkedDepFn) {
          const { data: depData } = await supabase
            .from('scheduled_flights')
            .select(SELECT_COLS)
            .eq('flight_number', linkedDepFn)
            .eq('movement_type', 'D')
            .in('flight_date', [dateStr, nextDayStr]);
          if (cancelled) return;
          if (depData && depData.length > 0) departure = pickByDate(depData as any[]);
        }
        const arrOrigin = (arrival as any)?.source_station ?? null;
        const depDest = (departure as any)?.source_station ?? null;
        const home = ((arrival as any)?.home_station ?? (departure as any)?.home_station) ?? null;
        const ldm = (arrival as any)?.ldm_raw ?? null;
        const logo = ((arrival as any)?.airline_logo ?? (departure as any)?.airline_logo) ?? null;
        // Se entrega en la llegada, así que sólo se mira esa fila.
        const belt = (arrival as any)?.baggage_belt ?? null;
        const extractTime = (val: string | null | undefined): string | null => {
          if (!val) return null;
          const m = String(val).match(/(\d{2}:\d{2})$/);
          return m ? m[1] : null;
        };
        const sta = extractTime((arrival as any)?.sdt);
        const eta = extractTime((arrival as any)?.edt);
        const std = extractTime((departure as any)?.connection_sdt);
        // Keep previous value when ARION returns nothing (preserve persisted info)
        if (arrOrigin !== null) setOriginStation(arrOrigin);
        if (depDest !== null) setDestStation(depDest);
        if (home !== null) setHomeStation(home);
        if (ldm !== null) setLdmRaw(ldm);
        if (logo !== null) setAirlineLogo(logo);
        if (belt !== null) setBaggageBelt(belt);
        if (sta !== null) setScheduledArrival(sta);
        if (eta !== null) setScheduledEta(eta);
        if (std !== null) setScheduledStd(std);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [flightNumber, departureFlightNumber, date]);




  // Auto-save refs
  // Subidas de adjuntos en marcha: guardar con alguna a medias perdía el
  // archivo, porque su URL sólo entra en la escala al terminar la subida.
  const uploadsInFlight = useUploadsInFlight();
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftWarned = useRef(false);
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
            // Escalas antiguas guardaban el parking en remoteLocation cuando
            // estaban marcadas como remotas (tango quedaba a null).
            setTango(existing.times.tango || existing.times.remoteLocation || '');
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
            // Hydrate ARION-derived info from saved record (will be refreshed if scheduled_flights still has data)
            setOriginStation((existing.times as any).originStation ?? null);
            setDestStation((existing.times as any).destStation ?? null);
            setHomeStation((existing.times as any).homeStation ?? null);
            setLdmRaw((existing.times as any).ldmRaw ?? null);
            setAirlineLogo((existing.times as any).airlineLogo ?? null);
            setBaggageBelt((existing.times as any).baggageBelt ?? null);
            setScheduledArrival((existing.times as any).scheduledArrival ?? null);
            setScheduledEta((existing.times as any).scheduledEta ?? null);
            setScheduledStd((existing.times as any).scheduledStd ?? null);
            setScheduledEtd((existing.times as any).scheduledEtd ?? null);
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
    // El parking se guarda siempre, sea remoto o de terminal: es el mismo dato
    // de ARION (T14 / 14) y antes se perdía al marcar "En Remoto".
    tango: tango || null,
    isRemote,
    remoteLocation: isRemote ? (tango || remoteLocation || null) : null,
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
    // ARION-derived info (persisted with the turnaround so it survives in PDFs/offline)
    originStation: originStation || null,
    destStation: destStation || null,
    homeStation: homeStation || null,
    ldmRaw: ldmRaw || null,
    airlineLogo: airlineLogo || null,
    baggageBelt: baggageBelt || null,
    scheduledArrival: scheduledArrival || (times as any).scheduledArrival || null,
    scheduledEta: scheduledEta || (times as any).scheduledEta || null,
    scheduledStd: scheduledStd || (times as any).scheduledStd || null,
    scheduledEtd: scheduledEtd || (times as any).scheduledEtd || null,
    // CPM snapshot survives in 'times' (set by AirlineTimesBlock when CPM is opened)
    cpmRawLines: (times as any).cpmRawLines ?? null,
  }), [times, tango, isRemote, remoteLocation, aircraftModel, matricula, soloLlegada, soloSalida, pushBack, departureTime, departureFlightNumber, loadingSheetUrls, fileUrls, observationPhotos, incidentReport, equipmentSelections, bodegasData, originStation, destStation, homeStation, ldmRaw, airlineLogo, baggageBelt, scheduledArrival, scheduledEta, scheduledStd, scheduledEtd]);

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

  /**
   * Escribe el borrador en el móvil. Si no cabe se avisa UNA vez y bien claro:
   * hasta ahora fallaba en silencio y el usuario seguía apuntando horas que no
   * quedaban respaldadas en ningún sitio.
   */
  const flushDraft = useCallback(() => {
    if (isInitialLoad.current || savedAndNavigating.current) return;
    let ok = false;
    try { ok = saveDraft(buildDraft()); } catch { ok = false; }
    if (!ok && !draftWarned.current) {
      draftWarned.current = true;
      toast({
        title: '⚠️ El móvil no puede guardar el borrador',
        description: 'Almacenamiento lleno. Pulsa Guardar ahora para no perder lo apuntado.',
        variant: 'destructive',
      });
    }
    if (ok) draftWarned.current = false;
  }, [buildDraft]);

  // --- Auto-save: save draft to localStorage on any change ---
  useEffect(() => {
    if (isInitialLoad.current || savedAndNavigating.current) return;
    hasUnsavedChanges.current = true;

    // Borrador local con retardo. Antes se serializaba la escala ENTERA a
    // localStorage en cada pulsación de tecla; es una escritura síncrona que
    // bloquea el hilo de la pantalla y en el móvil se notaba como tirones y
    // como que el cursor del campo se quedaba colgado. El respaldo real ante
    // un cierre inesperado lo da el flush de `pagehide`/`visibilitychange`.
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => { flushDraft(); }, DRAFT_DELAY);

    // Debounced server save (only in step 2, editing mode, online)
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    if (isEditing && step === 2) {
      autoSaveTimer.current = setTimeout(() => {
        autoSaveToServer();
      }, AUTOSAVE_DELAY);
    }

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightNumber, date, airline, aircraftModel, times, fieldValues, observations, tango, matricula, isRemote, remoteLocation, pushBack, departureTime, departureFlightNumber, loadingSheetUrls, fileUrls, observationPhotos, incidentReport, equipmentSelections, bodegasData, originStation, destStation, homeStation, ldmRaw, airlineLogo, baggageBelt, scheduledArrival, scheduledEta, scheduledStd, scheduledEtd]);

  /*
   * Guardado inmediato en cuanto cambian los adjuntos.
   *
   * La URL de un archivo sólo existe en memoria hasta que hay un guardado. Con
   * el autoguardado normal (3 s) bastaba con que la escala se recargara antes
   * para perderla: un adjunto real se perdió así porque el siguiente guardado
   * llegó 29 minutos más tarde. Las fotos de esa misma escala sobrevivieron
   * porque se guardó 5 segundos después.
   */
  const adjuntos = `${loadingSheetUrls.join('|')}#${fileUrls.join('|')}#${observationPhotos.join('|')}`;
  useEffect(() => {
    if (isInitialLoad.current || savedAndNavigating.current) return;
    flushDraft();
    if (isEditing) autoSaveToServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjuntos]);

  // --- Lifecycle safety net: flush draft before iOS suspends/kills the WebView ---
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden') flushDraft(); };
    window.addEventListener('pagehide', flushDraft);
    window.addEventListener('beforeunload', flushDraft);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flushDraft);
      window.removeEventListener('beforeunload', flushDraft);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [flushDraft]);

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

    // La miniatura de un adjunto es una previsualización local: se ve aunque el
    // archivo no haya llegado al servidor. Guardar ahora lo dejaría fuera.
    if (uploadsInFlight > 0) {
      toast({
        title: 'Espera a que suban los archivos',
        description: `Quedan ${uploadsInFlight} por subir. Si guardas ahora no quedarán en la escala.`,
        variant: 'destructive',
      });
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
            // También cuenta como guardado para quien pulsa: queda a salvo en
            // el móvil y se envía solo. Lo que cambia lo cuenta el aviso.
            flashSaved();
          } else {
            setLastSaved(new Date());
            clearDraft(id);
            flashSaved();
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

  // ---- Parking en vivo -------------------------------------------------
  // En LEMD el parking se asigna ~1 h antes del vuelo y puede cambiar hasta
  // minutos antes si el puesto está ocupado. Por eso la escala relee el
  // parking de ARION: a mano tocando el dato en la cabecera, y sola cada
  // pocos minutos mientras la escala del día está abierta.
  const { syncToday: syncArionToday } = useArionSync();
  const [parkingRefreshing, setParkingRefreshing] = useState(false);
  const [parkingChanged, setParkingChanged] = useState(false);
  const isToday = React.useMemo(() => {
    const now = new Date();
    return date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
  }, [date]);

  // Parking que ARION propone y no coincide con el de la escala. No se aplica
  // solo: se enseña para que decida quien está en la pista.
  const [arionParking, setArionParking] = useState<string | null>(null);

  const applyParkingUpdate = useCallback((code: string) => {
    setTango(code);
    const remote = isRemoteParking(code);
    if (remote !== null) setIsRemote(remote);
    setParkingChanged(true);
    setArionParking(null);
    setTimeout(() => setParkingChanged(false), 6000);
  }, []);

  const dateISO = React.useMemo(() => {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${mm}-${dd}`;
  }, [date]);

  const refreshParking = useCallback(async () => {
    const fn = flightNumber.trim();
    if (!fn) {
      toast({ title: 'Sin número de vuelo', description: 'La escala no tiene vuelo de llegada para consultar en ARION.' });
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      toast({ title: 'Sin conexión', description: 'El parking no se puede consultar ahora.', variant: 'destructive' });
      return;
    }
    setParkingRefreshing(true);
    try {
      // Primero se fuerza la sincronización con ARION para traer lo último,
      // y después se lee el parking ya actualizado.
      await syncArionToday();
      const code = await fetchParkingFromArion(fn, dateISO);
      if (!code) {
        toast({ title: 'ARION todavía no da parking', description: `El vuelo ${fn} aún no tiene puesto asignado.` });
        return;
      }
      if (code === tango.trim().toUpperCase()) {
        toast({ title: `Parking sin cambios: ${code}` });
        return;
      }
      // Consultar no es aceptar: si ya hay un parking puesto, se propone y se
      // cambia con un toque. Así ARION no puede llevarse por delante el puesto
      // real cuando el aeropuerto movió el avión y ARION no se enteró.
      if (tango.trim()) {
        setArionParking(code);
        toast({
          title: `ARION indica ${code}`,
          description: `La escala tiene ${tango.trim()}. Abajo puedes cambiarlo o mantener el tuyo.`,
        });
        return;
      }
      applyParkingUpdate(code);
      toast({
        title: `Parking asignado: ${code}`,
        description: isRemoteParking(code) ? 'Puesto remoto — la escala se ha marcado como remota.' : 'Puesto de terminal.',
      });
    } catch (err) {
      console.error('[parking] refresh error', err);
      toast({ title: 'Error', description: 'No se pudo actualizar el parking.', variant: 'destructive' });
    } finally {
      setParkingRefreshing(false);
    }
  }, [flightNumber, dateISO, tango, syncArionToday, applyParkingUpdate]);

  /*
   * Revisión automática del parking cada 5 min, sólo en escalas de hoy.
   *
   * Se para en cuanto hay una hora registrada: si el avión ya está recibido,
   * está en un puesto concreto y de ahí no se mueve. ARION, en cambio, sigue
   * publicando el puesto que le asignaron en su día aunque el aeropuerto lo
   * haya cambiado, y antes machacaba el parking real cada pocos minutos.
   *
   * Y aunque no esté fijada, esta comprobación ya nunca pisa un parking que
   * haya puesto una persona: si difiere, lo propone y decide quien está allí.
   */
  const parkingFijado = isParkingLocked(times);
  useEffect(() => {
    if (!isToday || !flightNumber.trim()) return;
    if (times.chocksOff || parkingFijado) return;
    let cancelled = false;
    const check = async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      try {
        const code = await fetchParkingFromArion(flightNumber.trim(), dateISO);
        if (cancelled || !code) return;
        const accion = decideParkingUpdate(code, tango, times);
        if (accion === 'ignore') return;
        if (accion === 'suggest') {
          setArionParking(code);
          return;
        }
        applyParkingUpdate(code);
        toast({
          title: `Parking asignado: ${code}`,
          description: isRemoteParking(code) ? 'Puesto remoto — la escala se ha marcado como remota.' : 'Puesto de terminal.',
        });
      } catch { /* silencioso: es una comprobación de fondo */ }
    };
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, flightNumber, dateISO, tango, times.chocksOff, parkingFijado, applyParkingUpdate]);

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
        scheduledArrival={scheduledArrival}
        setScheduledArrival={setScheduledArrival}
        scheduledEta={scheduledEta}
        setScheduledEta={setScheduledEta}
        scheduledStd={scheduledStd}
        setScheduledStd={setScheduledStd}
        scheduledEtd={scheduledEtd}
        setScheduledEtd={setScheduledEtd}
        
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
    // Columna flexible para que la barra de Guardar pueda ir pegada al final:
    // ver el comentario de `classic-save-bar` más abajo.
    <div className="min-h-screen flex flex-col bg-background">
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
        className={cn("aero-flight-header sticky z-50 bg-card/95 backdrop-blur border-b-2 border-border")}
        style={{ top: headerTopOffset + impersonationBarHeight }}
      >
        <div className="container mx-auto px-4 py-3 space-y-2">
          {/* Top row: back button + save */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              {!isEditing && (
                <button
                  onClick={() => setStep(1)}
                  className="aero-header-action shrink-0 flex items-center justify-center h-9 w-9 rounded-lg border-2 bg-muted border-border text-foreground hover:bg-muted/80 transition-colors"
                  aria-label="Volver atrás"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              {isEditing && (
                <button
                  onClick={() => navigate(-1)}
                  className="aero-header-action shrink-0 flex items-center justify-center h-9 w-9 rounded-lg border-2 bg-muted border-border text-foreground hover:bg-muted/80 transition-colors"
                  aria-label="Volver atrás"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              {airlineLogo && (
                <img
                  src={airlineLogo}
                  alt={airlineInfo?.name ?? 'Airline logo'}
                  className="aero-airline-logo h-7 w-auto max-w-[64px] object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>

            {/* min-w-0 (y no shrink-0) para que este grupo pueda ceder ancho:
                con shrink-0 el contenido empujaba el botón Guardar fuera del
                padding del contenedor en pantallas de ~412px. */}
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                onClick={() => setStep(1)}
                className="aero-header-action shrink-0 flex items-center justify-center h-9 w-9 rounded-lg border-2 bg-muted border-border text-foreground hover:bg-muted/80 transition-colors"
                title="Editar datos del vuelo"
                aria-label="Editar datos del vuelo"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <WindAlertBadge className="h-9 min-w-9" />
              <ConnectionStatus
                isOnline={isOnline}
                syncing={syncing}
                pendingCount={pendingCount}
                lastSaved={lastSaved}
              />
              <Button
                ref={saveButtonRef}
                onClick={handleSave}
                size="sm"
                className={cn(
                  'gap-1 shrink-0 h-9 px-2 text-xs transition-colors duration-200',
                  // Verde un instante al terminar: se ve de reojo, sin leer.
                  saveFlash && 'bg-emerald-600 hover:bg-emerald-600 text-white',
                )}
                disabled={saving}
                aria-label="Guardar"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {/* El texto se muestra siempre: al sacar de esta fila el botón
                    de estilo y el de reportar fallo ya hay sitio de sobra. */}
                <span>Guardar</span>
              </Button>
            </div>
          </div>

          {/*
            Datos de la escala. El reporte de fallo abre la fila por la
            izquierda: es la única acción que baja aquí, y va lejos de editar y
            viento —que están arriba a la derecha— para no provocar toques
            falsos al buscar esos dos.
            La fecha no se muestra: dentro de la escala ya se sabe qué día es.
          */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
            <IssueReportButton
              turnaroundId={id}
              flightNumber={flightNumber}
              airlineName={airlineInfo?.name ?? String(airline || '')}
              aircraftModel={aircraftModel}
              date={date}
              matricula={matricula}
              tango={tango}
              isRemote={isRemote}
              remoteLocation={remoteLocation}
              departureTime={departureTime}
              className="h-6 w-6"
            />
            <span>{airlineInfo?.name}</span>
            <span>|</span>
            <span>{aircraftModel}</span>
            <span>|</span>
            <button
              type="button"
              onClick={refreshParking}
              disabled={parkingRefreshing}
              title="Tocar para consultar el parking en ARION"
              aria-label="Actualizar parking desde ARION"
              /*
               * El color va EN LÍNEA y no como clase.
               *
               * Es un <button>, y en la cabecera acababa pintado con el gris
               * apagado de `--muted-foreground` (contraste 3 sobre el azul,
               * ilegible al sol) mientras el resto de la fila iba en blanco.
               * Ni `text-foreground` ni ninguna clase lo corregían: la clase
               * no llegaba a aplicarse al botón. Heredando el color de la
               * cabecera queda igual que el texto que lo rodea, y además es
               * correcto en los cinco estilos sin fijar un blanco literal.
               * Medido: contraste 3 → 17,23.
               */
              style={{ color: 'inherit' }}
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold transition-colors',
                'hover:bg-muted active:scale-95 disabled:opacity-60',
                // En remoto el aviso lo da el fondo ámbar, no el color del
                // texto: así se distingue sin perder legibilidad.
                isRemote && 'bg-warning/25 ring-1 ring-warning/60',
                parkingChanged && 'ring-2 ring-green-500 bg-green-500/10'
              )}
            >
              {parkingRefreshing
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <RefreshCw className="h-3 w-3 opacity-80" />}
              {(tango || remoteLocation) || 'Parking'}
              {isRemote && (tango || remoteLocation) ? ' · Remoto' : ''}
            </button>
            {matricula && (
              <>
                <span>|</span>
                <span>{matricula}</span>
              </>
            )}
            {/* La barra separadora va DENTRO del bloque, no como elemento
                suelto: así viaja con la sala al pasar a la línea siguiente en
                vez de quedarse colgando al final de la anterior.
                Sin color propio: hereda el de la fila, que es el que mejor
                contrasta en cada estilo (blanco sobre la cabecera oscura). */}
            {formatBaggageBelt(baggageBelt) && (
              <span className="flex items-center gap-2 whitespace-nowrap">
                <span aria-hidden>|</span>
                <span className="flex items-center gap-1">
                  <Luggage className="h-3 w-3" />
                  {formatBaggageBelt(baggageBelt)}
                </span>
              </span>
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

          <div id="aero-flight-documents" className="aero-only" />

          {/* Flight route row: centered arrival/departure (temas dark/light/exterior) */}
          {(homeStation && (originStation || destStation)) && (
            <div className="classic-only sky-replaced flex items-center justify-center gap-3 text-xs font-semibold">
              {homeStation && originStation && (
                <span className="route-segment text-emerald-600 dark:text-emerald-400">
                  <Plane className="route-plane h-3 w-3" />
                  <span className="route-emoji">✈</span> {originStation} → {homeStation}
                </span>
              )}
              {homeStation && originStation && homeStation && destStation && (
                <span className="text-muted-foreground">|</span>
              )}
              {homeStation && destStation && (
                <span className="route-segment text-rose-600 dark:text-rose-400">
                  <Plane className="route-plane h-3 w-3" />
                  <span className="route-emoji">✈</span> {homeStation} → {destStation}
                </span>
              )}
            </div>
          )}

          {/* Flight route bar: tarjeta ancha LIS/MAD con avión animado (solo tema Sky) */}
          {homeStation && originStation && (
            <div className="route-sky-bar">
              <div className="route-sky-bar-row">
                <div>
                  <div className="route-sky-bar-code text-emerald-600 dark:text-emerald-400">{originStation}</div>
                  <div className="route-sky-bar-label">ORIGEN</div>
                </div>
                <div className="route-sky-bar-track">
                  <svg viewBox="0 0 200 28" preserveAspectRatio="none" className="w-full h-full absolute inset-0">
                    <line x1="4" y1="14" x2="196" y2="14" strokeWidth="2.5" className="route-sky-bar-line" />
                  </svg>
                  <Plane className="route-sky-bar-plane h-4 w-4 rotate-45" />
                </div>
                <div className="text-right">
                  <div className="route-sky-bar-code text-foreground">{homeStation}</div>
                  <div className="route-sky-bar-label">DESTINO</div>
                </div>
              </div>
            </div>
          )}
          {homeStation && destStation && (
            <div className="route-sky-bar">
              <div className="route-sky-bar-row">
                <div>
                  <div className="route-sky-bar-code text-foreground">{homeStation}</div>
                  <div className="route-sky-bar-label">ORIGEN</div>
                </div>
                <div className="route-sky-bar-track">
                  <svg viewBox="0 0 200 28" preserveAspectRatio="none" className="w-full h-full absolute inset-0">
                    <line x1="4" y1="14" x2="196" y2="14" strokeWidth="2.5" className="route-sky-bar-line" />
                  </svg>
                  <Plane className="route-sky-bar-plane h-4 w-4 rotate-45" />
                </div>
                <div className="text-right">
                  <div className="route-sky-bar-code text-rose-600 dark:text-rose-400">{destStation}</div>
                  <div className="route-sky-bar-label">DESTINO</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </header>

      {/* `pb-28` reservaba hueco para la barra fija, que se superponía al
          contenido. Ahora la barra ocupa su propio sitio y sobra ese hueco. */}
      <main className="w-full flex-1 px-2 sm:px-4 py-6 space-y-6 pb-6">
        {/* ARION propone otro parking. Nunca se aplica solo: si el aeropuerto
            movió el avión, el que manda es quien está en la pista. */}
        {arionParking && (
          <div className="rounded-lg border-2 border-sky-500 bg-sky-500/15 p-3 text-sky-700 dark:text-sky-400">
            <p className="font-semibold">ARION indica el parking {arionParking}</p>
            <p className="text-sm opacity-90">
              La escala tiene {tango || remoteLocation || 'ninguno'}. Si el avión no se ha movido, ignóralo.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => applyParkingUpdate(arionParking)}
                className="flex-1 rounded-md border-2 border-current bg-background/60 py-2 font-semibold"
              >
                Cambiar a {arionParking}
              </button>
              <button
                type="button"
                onClick={() => setArionParking(null)}
                className="flex-1 rounded-md border border-current/40 py-2 font-medium"
              >
                Mantener el mío
              </button>
            </div>
          </div>
        )}

        {/* Adjuntos que se subieron pero no llegaron a quedar en la escala. */}
        <AttachmentRecovery
          turnaroundId={id}
          loadingSheetUrls={loadingSheetUrls}
          fileUrls={fileUrls}
          observationPhotos={observationPhotos}
          onRecover={(r) => {
            if (r.loadingSheetUrls.length) setLoadingSheetUrls(prev => [...prev, ...r.loadingSheetUrls]);
            if (r.fileUrls.length) setFileUrls(prev => [...prev, ...r.fileUrls]);
            if (r.observationPhotos.length) setObservationPhotos(prev => [...prev, ...r.observationPhotos]);
          }}
        />
        <div id="sec-tiempos" className="scroll-mt-48">
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
          scheduledArrival={scheduledArrival}
          scheduledEta={scheduledEta}
          scheduledStd={scheduledStd}
          scheduledEtd={scheduledEtd}
          flightDate={date}
          originStation={originStation}
          destStation={destStation}
          homeStation={homeStation}
        />
        </div>

        <div id="sec-campos" className="scroll-mt-48 space-y-6">
        {(selectedAirline === 'AIR_CANADA' || selectedAirline === 'AIR_CANADA_CARGO') && (
          <AirCanadaCargoScanner
            flightNumber={flightNumber}
            flightDate={date ? format(date, 'yyyy-MM-dd') : ''}
            aircraftType={aircraftModel}
            turnaroundId={id}
          />
        )}




        {(selectedAirline === 'FEDEX' || selectedAirline === 'AMAZON') && (
          <BodegasSection
            data={bodegasData}
            onChange={setBodegasData}
          />
        )}

        {selectedAirline !== 'FEDEX' && selectedAirline !== 'AMAZON' && selectedAirline !== 'AIR_CANADA' && selectedAirline !== 'AIR_CANADA_CARGO' && !soloLlegada && (
          <AirlineTabs
            airline={selectedAirline}
            aircraftModel={aircraftModel}
            fieldValues={fieldValues}
            onChange={setFieldValues}
          />
        )}
        </div>

        <div id="sec-equipos" className="scroll-mt-48">
        <EquipmentSection
          airline={selectedAirline}
          aircraftModel={aircraftModel || null}
          isRemote={isRemote}
          pushBack={pushBack}
          equipment={equipmentSelections}
          onChange={setEquipmentSelections}
        />
        </div>

        <Button
          type="button"
          variant="secondary"
          className="aero-export-pdf w-full gap-2 font-semibold"
          onClick={() => setPdfDialogOpen(true)}
        >
          <FileDown className="h-4 w-4" />
          Exportar PDF
        </Button>

        {/* Se elige qué imágenes van al PDF antes de generarlo. */}
        <PdfExportDialog
          open={pdfDialogOpen}
          onOpenChange={setPdfDialogOpen}
          counts={{
            loadingSheets: loadingSheetUrls.length,
            files: fileUrls.length,
            observationPhotos: observationPhotos.length,
          }}
          onExport={async (images) => {
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
            }, images);
          }}
        />

        {selectedAirline === 'WESTJET' && (
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/50 bg-amber-500/10 rounded-md p-3 leading-relaxed">
            En la LIR, hay que remarcar en círculo la matrícula del avión, la edición de la LIR y plasmar las iniciales de tu nombre en ambas marcas para afirmar la información.
          </div>
        )}

        <div id="sec-fotos" className="scroll-mt-48 space-y-6">
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
        </div>

        <Card id="sec-obs" className="card-operational scroll-mt-48">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                Observaciones
              </div>
              {/* El parking se guarda tal cual lo publica ARION, con su "T" si
                  la lleva: anteponer otra producía "TT31" en el informe. */}
              <IncidentReportDialog
                flightNumber={flightNumber}
                date={date}
                parking={tango || remoteLocation || '—'}
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

      {showSaveFab && step === 2 && (
        /*
         * `sticky` y NO `fixed` a propósito.
         *
         * Un elemento fijo se ancla al viewport visible del móvil. Al abrirse el
         * teclado iOS lo encoge, y al cerrarlo a veces no recalcula: la barra se
         * quedaba clavada a media pantalla, tapando contenido, hasta cerrar la
         * app entera. Pegada al flujo de la página no hay anclaje que se quede
         * obsoleto, porque se posiciona respecto al desplazamiento y no respecto
         * al viewport.
         */
        <div className="classic-save-bar sticky bottom-0 z-40 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-background/95 backdrop-blur border-t border-border">
          <button
            onClick={handleSave}
            disabled={saving}
            aria-label="Guardar"
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold',
              'disabled:opacity-60 active:scale-[0.99] transition-all duration-200',
              saveFlash ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground',
            )}
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            <span>Guardar</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TurnaroundForm;
