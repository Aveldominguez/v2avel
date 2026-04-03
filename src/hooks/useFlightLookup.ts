import { useState, useEffect, useRef, useCallback } from 'react';
import { AirlineCode, AIRLINES } from '@/types/turnaround';
import { supabase } from '@/integrations/supabase/client';

interface FlightLookupResult {
  airlineName: string | null;
  airlineCode: AirlineCode | null;
  aircraftModel: string | null;
  registration: string | null;
}

interface UseFlightLookupReturn {
  isLoading: boolean;
  error: string | null;
  result: FlightLookupResult | null;
  autofilledFields: Set<string>;
  clearAutofill: () => void;
}

// Map API airline names to our internal codes
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
};

function matchAirlineCode(name: string): AirlineCode | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();

  // Direct match
  if (AIRLINE_NAME_MAP[lower]) return AIRLINE_NAME_MAP[lower];

  // Partial match
  for (const [key, code] of Object.entries(AIRLINE_NAME_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return code;
  }

  // Match against our AIRLINES array
  const found = AIRLINES.find(
    (a) => a.name.toLowerCase() === lower || a.shortName.toLowerCase() === lower
  );
  return found ? found.code : null;
}

// Expected number of numeric digits after the airline prefix
const EXPECTED_DIGITS = 4;

// Extract the numeric suffix length from a flight code
function getDigitCount(flight: string): number {
  const match = flight.match(/(\d+)$/);
  return match ? match[1].length : 0;
}

export function useFlightLookup(flightIata: string, debounceMs = 300): UseFlightLookupReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FlightLookupResult | null>(null);
  const [autofilledFields, setAutofilledFields] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutofill = useCallback(() => {
    setAutofilledFields(new Set());
    setResult(null);
    setError(null);
  }, []);

  useEffect(() => {
    const clean = flightIata.trim().replace(/\s/g, '');
    const digits = getDigitCount(clean);

    // Only call API when the flight number has exactly the expected digits
    if (clean.length < 3 || digits !== EXPECTED_DIGITS) {
      setError(null);
      setIsLoading(false);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const { data: responseData, error: fnError } = await supabase.functions.invoke('flight-lookup', {
          body: { flight_iata: clean },
        });

        if (fnError) throw new Error('Error al consultar la API');

        const json = responseData;

        if (!json.data || json.data.length === 0) {
          setError('Vuelo no encontrado');
          setResult(null);
          setIsLoading(false);
          return;
        }

        const flight = json.data[0];
        const filled = new Set<string>();

        const airlineName = flight.airline?.name || null;
        const airlineCode = airlineName ? matchAirlineCode(airlineName) : null;
        const aircraftModel = flight.aircraft?.iata || null;
        const registration = flight.aircraft?.registration || null;

        if (airlineCode) filled.add('airline');
        if (aircraftModel) filled.add('aircraftModel');
        if (registration) filled.add('matricula');

        setResult({ airlineName, airlineCode, aircraftModel, registration });
        setAutofilledFields(filled);
        setIsLoading(false);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError('Error al buscar el vuelo');
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flightIata, debounceMs]);

  return { isLoading, error, result, autofilledFields, clearAutofill };
}
