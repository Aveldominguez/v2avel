import { useState, useEffect, useRef } from 'react';
import { AirlineCode } from '@/types/turnaround';
import { supabase } from '@/integrations/supabase/client';

interface FlightLookupResult {
  airlineName: string | null;
  airlineCode: AirlineCode | null;
  aircraftModel: string | null;
  registration: string | null;
  parkingCode: string | null;
  departureFlight: string | null;
  edtHHmm: string | null;
  ldmRaw: string | null;
}

interface UseFlightLookupReturn {
  isLoading: boolean;
  error: string | null;
  result: FlightLookupResult | null;
  notFound: boolean;
  autofilledFields: Set<string>;
  clearAutofill: () => void;
}

// IATA 2-letter airline code → internal AirlineCode
const IATA_AIRLINE_MAP: Record<string, AirlineCode> = {
  'TP': 'TAP',
  'W6': 'WIZZ',
  'AZ': 'ITA',
  'A3': 'AEGEAN',
  'PC': 'PEGASUS',
  'TO': 'TRANSAVIA',
  'HV': 'TRANSAVIA',
  'GQ': 'SKYEXPRESS',
  'PQ': 'SKYUP',
  'FX': 'FEDEX',
  'AC': 'AIR_CANADA',
  'WS': 'WESTJET',
  'AP': 'ALBASTAR',
  'FI': 'ICELANDAIR',
  'AD': 'AZUL',
  '5Y': 'AMAZON',
  'VG': 'A_JET',
  'NP': 'NILE_AIR',
  'EW': 'EUROWINGS',
  'OU': 'CROATIA',
  'E4': 'AIR_EST',
};

function getDigitCount(flight: string): number {
  const match = flight.match(/(\d+)$/);
  return match ? match[1].length : 0;
}

export function useFlightLookup(flightIata: string, debounceMs = 400): UseFlightLookupReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FlightLookupResult | null>(null);
  const [autofilledFields, setAutofilledFields] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKeyRef = useRef<string | null>(null);

  const clearAutofill = () => {
    setAutofilledFields(new Set());
    setResult(null);
    setError(null);
  };

  useEffect(() => {
    const clean = flightIata.trim().replace(/\s/g, '').toUpperCase();
    const digits = getDigitCount(clean);

    // Need at least 3 chars and at least 1 digit to query
    if (clean.length < 3 || digits < 1) {
      setError(null);
      setIsLoading(false);
      return;
    }

    // Debounce
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      // Avoid re-querying the same flight number
      if (lastKeyRef.current === clean) return;
      lastKeyRef.current = clean;

      setIsLoading(true);
      setError(null);

      try {
        // Query scheduled_flights for today ±1 day
        const today = new Date();
        const toISO = (d: Date) => d.toISOString().split('T')[0];
        const prev = new Date(today); prev.setDate(today.getDate() - 1);
        const next = new Date(today); next.setDate(today.getDate() + 1);
        const dates = [toISO(today), toISO(prev), toISO(next)];

        const { data, error: dbError } = await supabase
          .from('scheduled_flights')
          .select('aircraft_type, airline_code, flight_number, flight_date')
          .eq('flight_number', clean)
          .in('flight_date', dates)
          .eq('movement_type', 'A')
          .order('flight_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (dbError) throw dbError;

        if (!data) {
          setError('Vuelo no encontrado en ARION');
          setResult(null);
          setIsLoading(false);
          return;
        }

        const filled = new Set<string>();

        // Map IATA airline code → internal code
        const internalCode = data.airline_code
          ? (IATA_AIRLINE_MAP[data.airline_code.toUpperCase()] ?? null)
          : null;

        if (internalCode) filled.add('airline');
        if (data.aircraft_type) filled.add('aircraftModel');

        setResult({
          airlineName: data.airline_code ?? null,
          airlineCode: internalCode,
          aircraftModel: data.aircraft_type ?? null,  // IATA code e.g. '223', '333'
          registration: null,  // ARION no devuelve matrícula en scheduled_flights
        });
        setAutofilledFields(filled);
      } catch (err) {
        setError('Error al buscar el vuelo');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flightIata]);

  return { isLoading, error, result, autofilledFields, clearAutofill };
}
