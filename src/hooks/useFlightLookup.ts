import { useState, useEffect, useRef, useCallback } from 'react';
import { AirlineCode, AIRLINES } from '@/types/turnaround';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface FlightLookupResult {
  airlineName: string | null;
  airlineCode: AirlineCode | null;
  aircraftModel: string | null;
  registration: string | null;
  parkingCode: string | null;
  edtHHmm: string | null;
  source: 'arion' | 'fr24';
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
  'ita airways': 'ITA',
  'aegean airlines': 'AEGEAN',
  'aegean': 'AEGEAN',
  'pegasus airlines': 'PEGASUS',
  'pegasus': 'PEGASUS',
  'transavia': 'TRANSAVIA',
  'transavia france': 'TRANSAVIA',
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
  TP: 'TAP', W6: 'WIZZ', AZ: 'ITA', A3: 'AEGEAN', PC: 'PEGASUS',
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

export function useFlightLookup(flightIata: string, debounceMs = 300): UseFlightLookupReturn {
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

    // Offline guard
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      lastQueriedRef.current = clean;
      setIsLoading(true);
      setError(null);
      setNotFound(false);

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
  }, [flightIata, debounceMs]);

  return { isLoading, error, result, notFound, autofilledFields, clearAutofill };
}
