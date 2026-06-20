import { useState, useEffect, useRef, useCallback } from 'react';
import { AirlineCode, AIRLINES } from '@/types/turnaround';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getCatalogSnapshot, type AircraftModelOverride } from '@/lib/catalogStore';

interface FlightLookupResult {
  airlineName: string | null;
  airlineCode: AirlineCode | null;
  aircraftModel: string | null;
  registration: string | null;
  parkingCode: string | null;
  edtHHmm: string | null;
  departureFlight: string | null;
  originStation: string | null;
  ldmRaw: string | null;
  source: 'arion' | 'fr24';
}

// ARION airline code → app internal code
const ARION_TO_APP_AIRLINE: Record<string, string> = {
  'TAP': 'TAP', 'TP': 'TAP', 'TAPPORTUGAL': 'TAP', 'TAPAIRPORTUGAL': 'TAP',
  'W': 'WIZZ', 'W6': 'WIZZ', 'WIZZ': 'WIZZ', 'WZ': 'WIZZ',
  'WIZZAIRMALTA': 'WIZZ', 'WIZZAIRLTD': 'WIZZ', 'WIZZAIRHUNGARY': 'WIZZ', 'WIZZAIRUK': 'WIZZ',
  'ITA': 'ITA', 'ITAAIRWAYS': 'ITA', 'AZ': 'ITA',
  'AEGEAN': 'AEGEAN', 'A3': 'AEGEAN', 'AEG': 'AEGEAN',
  'AEGEANAIRLINES': 'AEGEAN', 'AEGEANAIRLINESSA': 'AEGEAN',
  'TO': 'TRANSAVIA', 'TRANSAVIA': 'TRANSAVIA', 'HV': 'TRANSAVIA',
  'TRANSAVIAFRANCE': 'TRANSAVIA', 'TRANSAVIAHOLLAND': 'TRANSAVIA', 'TRANSAVIANETHERLANDS': 'TRANSAVIA',
  'PC': 'PEGASUS', 'PEGASUS': 'PEGASUS', 'PEGASUSAIRLINES': 'PEGASUS',
  'GQ': 'SKYEXPRESS', 'SKY': 'SKYEXPRESS', 'SKYEXPRESS': 'SKYEXPRESS',
  'EW': 'EUROWINGS', 'EUROWINGS': 'EUROWINGS',
  'WS': 'WESTJET', 'WESTJET': 'WESTJET',
  'VF': 'A_JET', 'AJET': 'A_JET',
  'AP': 'ALBASTAR', 'ALBASTAR': 'ALBASTAR',
  'OU': 'CROATIA', 'CROATIA': 'CROATIA', 'CROATIAAIRLINES': 'CROATIA',
  'NP': 'NILE_AIR', 'NILEAIR': 'NILE_AIR',
  'FI': 'ICELANDAIR', 'ICELANDAIR': 'ICELANDAIR',
  'AC': 'AIR_CANADA', 'AIRCANADA': 'AIR_CANADA',
  'AD': 'AZUL', 'AZUL': 'AZUL',
  'PQ': 'SKYUP', 'SKYUP': 'SKYUP',
  'ABR': 'AMAZON', 'AMAZON': 'AMAZON',
  '3V': 'FEDEX', 'FEDEX': 'FEDEX', 'FX': 'FEDEX',
  'AE': 'AIR_EST', 'AIREST': 'AIR_EST',
};

const ICAO_TO_MODEL_KEYWORDS: Record<string, string[]> = {
  '32N': ['A320', 'neo'],
  '320': ['A320'],
  '319': ['A319'],
  '321': ['A321'],
  '20N': ['A321', 'neo'],
  '738': ['737', '800'],
  '737': ['737'],
  '75C': ['737'],
  '734': ['734'],
  '333': ['A330'],
  '339': ['A330', '900'],
  '767': ['767'],
  '77W': ['777'],
  '788': ['787', '800'],
  '789': ['787', '900'],
  'E90': ['E90'],
  'E95': ['E95'],
};

function findAircraftModelCode(icaoType: string | null, models: AircraftModelOverride[]): string | null {
  if (!icaoType) return null;
  const key = icaoType.toUpperCase();
  const exact = models.find(m => m.modelCode?.toUpperCase() === key);
  if (exact) return exact.modelCode;
  const keywords = ICAO_TO_MODEL_KEYWORDS[key];
  if (keywords) {
    const match = models.find(m =>
      keywords.every(kw =>
        m.modelCode?.toUpperCase().includes(kw.toUpperCase()) ||
        m.label?.toUpperCase().includes(kw.toUpperCase())
      )
    );
    if (match) return match.modelCode;
  }
  const partial = models.find(m =>
    m.modelCode?.toUpperCase().includes(key) ||
    m.label?.toUpperCase().includes(key)
  );
  return partial?.modelCode ?? null;
}

interface UseFlightLookupReturn {
  isLoading: boolean;
  error: string | null;
  result: FlightLookupResult | null;
  notFound: boolean;
  autofilledFields: Set<string>;
  clearAutofill: () => void;
}

function todayIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function parseEdtHHmm(edt: string | null | undefined): string | null {
  if (!edt) return null;
  // "dd/MM/yyyy HH:mm" or "HH:mm"
  const m = edt.match(/(\d{2}):(\d{2})/);
  if (!m) return null;
  return `${m[1]}:${m[2]}`;
}


// Map FR24/API airline names + IATA codes to our internal AirlineCode
const AIRLINE_NAME_MAP: Record<string, AirlineCode> = {
  'tap portugal': 'TAP',
  'tap air portugal': 'TAP',
  'wizz air': 'WIZZ',
  'wizz air malta': 'WIZZ',
  'wizz air ltd': 'WIZZ',
  'wizz air hungary': 'WIZZ',
  'wizz air uk': 'WIZZ',
  'ita airways': 'ITA',
  'aegean airlines': 'AEGEAN',
  'aegean airlines sa': 'AEGEAN',
  'aegean': 'AEGEAN',
  'pegasus airlines': 'PEGASUS',
  'pegasus': 'PEGASUS',
  'transavia': 'TRANSAVIA',
  'transavia france': 'TRANSAVIA',
  'transavia holland': 'TRANSAVIA',
  'transavia netherlands': 'TRANSAVIA',
  'sky express': 'SKYEXPRESS',
  'fedex': 'FEDEX',
  'federal express': 'FEDEX',
  'air canada': 'AIR_CANADA',
  'westjet': 'WESTJET',
  'albastar': 'ALBASTAR',
  'icelandair': 'ICELANDAIR',
  'azul': 'AZUL',
  'azul brazilian airlines': 'AZUL',
  'amazon air': 'AMAZON',
  'amazon': 'AMAZON',
  'a jet': 'A_JET',
  'ajet': 'A_JET',
  'nile air': 'NILE_AIR',
  'eurowings': 'EUROWINGS',
  'croatia airlines': 'CROATIA',
  'croatia': 'CROATIA',
  'skyup': 'SKYUP',
};

// IATA airline code → AirlineCode
const AIRLINE_IATA_MAP: Record<string, AirlineCode> = {
  TP: 'TAP', W6: 'WIZZ', W9: 'WIZZ', AZ: 'ITA', A3: 'AEGEAN', PC: 'PEGASUS',
  HV: 'TRANSAVIA', TO: 'TRANSAVIA', GQ: 'SKYEXPRESS', FX: 'FEDEX',
  AC: 'AIR_CANADA', WS: 'WESTJET', AP: 'ALBASTAR', FI: 'ICELANDAIR',
  AD: 'AZUL', VF: 'A_JET', NP: 'NILE_AIR', EW: 'EUROWINGS', OU: 'CROATIA',
  PQ: 'SKYUP',
};

// ICAO airline code → AirlineCode (FR24 often returns ICAO in `painted_as`/`operating_as`)
const AIRLINE_ICAO_MAP: Record<string, AirlineCode> = {
  TAP: 'TAP', WZZ: 'WIZZ', ITY: 'ITA', AEE: 'AEGEAN', PGT: 'PEGASUS',
  TRA: 'TRANSAVIA', TVF: 'TRANSAVIA', SEH: 'SKYEXPRESS', FDX: 'FEDEX',
  ACA: 'AIR_CANADA', WJA: 'WESTJET', LAV: 'ALBASTAR', ICE: 'ICELANDAIR',
  AZU: 'AZUL', KKK: 'A_JET', NIA: 'NILE_AIR', EWG: 'EUROWINGS', CTN: 'CROATIA',
  SQP: 'SKYUP', GTI: 'AMAZON', PAC: 'AMAZON',
};

function matchAirlineCode(
  name: string | null,
  iata: string | null,
  flightIata?: string,
): AirlineCode | null {
  if (iata) {
    const up = iata.toUpperCase();
    if (up.length === 3 && AIRLINE_ICAO_MAP[up]) return AIRLINE_ICAO_MAP[up];
    if (AIRLINE_IATA_MAP[up]) return AIRLINE_IATA_MAP[up];
    if (AIRLINE_ICAO_MAP[up]) return AIRLINE_ICAO_MAP[up];
  }
  if (name) {
    const lower = name.toLowerCase().trim();
    if (AIRLINE_NAME_MAP[lower]) return AIRLINE_NAME_MAP[lower];
    for (const [key, code] of Object.entries(AIRLINE_NAME_MAP)) {
      if (lower.includes(key) || key.includes(lower)) return code;
    }
    const found = AIRLINES.find(
      (a) => a.name.toLowerCase() === lower || a.shortName.toLowerCase() === lower
    );
    if (found) return found.code;
  }
  // Fallback: derive from flight-number prefix (e.g. "TO4632" → "TO" → TRANSAVIA)
  if (flightIata) {
    const clean = flightIata.toUpperCase().replace(/\s/g, '');
    const m = clean.match(/^([A-Z]+)/);
    if (m) {
      const pfx = m[1];
      for (const len of [3, 2, 1]) {
        if (pfx.length >= len) {
          const cand = pfx.slice(0, len);
          if (AIRLINE_IATA_MAP[cand]) return AIRLINE_IATA_MAP[cand];
          if (AIRLINE_ICAO_MAP[cand]) return AIRLINE_ICAO_MAP[cand];
        }
      }
    }
  }
  return null;
}

// Flight number completion rules — prefix → required numeric digits
const FLIGHT_NUMBER_RULES: Record<string, number> = {
  'W': 5,    // Wizz Air
  'U': 4,    // Transavia
  'A': 4,    // Aegean
  'GQ': 3,   // Sky Express
  'EW': 4,   // Eurowings
  'PC': 4,   // Pegasus
  'TP': 4,   // TAP
  'TO': 4,   // Transavia FR
  'WS': 4,   // WestJet
  'VF': 3,   // A Jet
  'AP': 3,   // AlbaStar
  'OU': 3,   // Croatia
  'AZ': 3,   // ITA
  'NP': 4,   // Nile Air
  'AE': 3,   // Air Est
  'FI': 4,   // Icelandair
  'AC': 4,   // Air Canada
  'AD': 4,   // Azul
  'PQ': 4,   // SkyUp
  '3V': 4,   // FedEx
  'ABR': 3,  // Amazon Air
  'AEG': 3,  // Aegean alt
};

export function isFlightNumberComplete(input: string): boolean {
  if (!input) return false;
  const clean = input.toUpperCase().trim().replace(/\s/g, '');

  // Extract letter prefix
  const prefixMatch = clean.match(/^([A-Z0-9]*?[A-Z]+)?/);
  // Simpler: split letters at start vs digits after
  const m = clean.match(/^([A-Z0-9]+?)(\d+)$/);
  if (!m) return false;
  const rawPrefix = m[1];
  const digits = m[2];

  // Try 3-letter, 2-letter, 1-letter prefix matches (longest first)
  for (const len of [3, 2, 1]) {
    if (rawPrefix.length >= len) {
      const candidate = rawPrefix.slice(0, len);
      const required = FLIGHT_NUMBER_RULES[candidate];
      if (required !== undefined && rawPrefix.length === len) {
        return digits.length === required;
      }
    }
  }
  return false;
}

export function useFlightLookup(
  flightIata: string,
  selectedDate?: Date,
  debounceMs = 300
): UseFlightLookupReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FlightLookupResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [autofilledFields, setAutofilledFields] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueriedRef = useRef<string>('');

  const clearAutofill = useCallback(() => {
    setAutofilledFields(new Set());
    setResult(null);
    setError(null);
    setNotFound(false);
  }, []);

  useEffect(() => {
    const clean = flightIata.trim().toUpperCase().replace(/\s/g, '');

    if (!isFlightNumberComplete(clean)) {
      setError(null);
      setIsLoading(false);
      return;
    }

    if (clean === lastQueriedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      lastQueriedRef.current = clean;
      setIsLoading(true);
      setError(null);
      setNotFound(false);

      // ── 1) ARION lookup (scheduled_flights for selected date) ──
      if (user) {
        try {
          const d = selectedDate ?? new Date();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const dateStr = `${d.getFullYear()}-${mm}-${dd}`;
          const { data: arion } = await supabase
            .from('scheduled_flights')
            .select('flight_number, airline_code, aircraft_type, registration, parking_code, source_station, edt, sdt, departure_fn, movement_type, ldm_raw, connection_sdt')
            .eq('flight_number', clean)
            .eq('flight_date', dateStr)
            .eq('movement_type', 'A')
            .maybeSingle();

          if (arion) {
            const rawCode = (arion.airline_code || '').toUpperCase().replace(/\s/g, '');
            const mappedCode = ARION_TO_APP_AIRLINE[rawCode] ?? rawCode;
            const airlineCode: AirlineCode | null =
              (AIRLINES.find((a) => a.code === mappedCode)?.code as AirlineCode) ??
              matchAirlineCode(arion.airline_code ?? null, null, clean) ??
              null;

            const activeModels = getCatalogSnapshot().aircraftModels.filter(m => m.active);
            const mappedAircraft = findAircraftModelCode(arion.aircraft_type ?? null, activeModels)
              ?? (arion.aircraft_type ?? null);

            const departureFlight = (arion as any).departure_fn
              ? String((arion as any).departure_fn).toUpperCase().replace(/\s/g, '')
              : null;

            const registration = (arion as any).registration
              ? String((arion as any).registration).toUpperCase().replace(/\s/g, '')
              : null;

            // 2. Si hay vuelo de salida, obtener su sdt
            let departureSdt: string | null = null;
            if (arion.departure_fn) {
              const { data: depFlight } = await supabase
                .from('scheduled_flights')
                .select('sdt')
                .eq('flight_number', arion.departure_fn)
                .eq('flight_date', dateStr)
                .eq('movement_type', 'D')
                .maybeSingle();
              departureSdt = depFlight?.sdt ?? null;
            }

            // 3. Extraer HH:MM del sdt del vuelo de salida, fallback connection_sdt
            const rawTime = departureSdt ?? arion.connection_sdt ?? null;
            const edtHHmm = rawTime
              ? rawTime.split(' ')[1]?.slice(0, 5) ?? null
              : null;

            const filled = new Set<string>();
            if (airlineCode) filled.add('airline');
            if (mappedAircraft) filled.add('aircraftModel');
            if (registration) filled.add('matricula');
            if (arion.parking_code) filled.add('tango');
            if (edtHHmm) filled.add('departureTime');
            if (departureFlight) filled.add('departureFlight');

            setResult({
              airlineName: null,
              airlineCode,
              aircraftModel: mappedAircraft,
              registration,
              parkingCode: arion.parking_code ?? null,
              edtHHmm,
              departureFlight,
              originStation: (arion as any).source_station ?? null,
              ldmRaw: (arion as any).ldm_raw ?? null,
              source: 'arion',
            });
            setAutofilledFields(filled);
            setIsLoading(false);
            return;
          }

        } catch (err) {
          console.warn('[lookup] ARION query failed, falling back to FR24', err);
        }
      }

      // ── 2) FR24 fallback (only if not found in ARION) ──
      // Offline guard for FR24
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: responseData, error: fnError } = await supabase.functions.invoke('flight-lookup', {
          body: { flight_iata: clean },
        });

        if (fnError) throw new Error('Error al consultar la API');

        const json = responseData;

        if (!json || json.found === false) {
          setNotFound(true);
          setResult(null);
          setIsLoading(false);
          return;
        }

        const filled = new Set<string>();
        const airlineCode = matchAirlineCode(json.airline_name ?? null, json.airline_iata ?? null, clean);
        const aircraftModel = json.aircraft_model || null;
        const registration = json.aircraft_registration || null;

        if (airlineCode) filled.add('airline');
        if (aircraftModel) filled.add('aircraftModel');
        if (registration) filled.add('matricula');

        setResult({
          airlineName: json.airline_name ?? null,
          airlineCode,
          aircraftModel,
          registration,
          parkingCode: null,
          edtHHmm: null,
          departureFlight: null,
          originStation: null,
          ldmRaw: null,
          source: 'fr24',
        });
        setAutofilledFields(filled);
        setIsLoading(false);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setNotFound(true);
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flightIata, selectedDate, debounceMs, user]);


  return { isLoading, error, result, notFound, autofilledFields, clearAutofill };
}
