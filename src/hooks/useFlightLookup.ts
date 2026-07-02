import { AirlineCode } from '@/types/turnaround';

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

export function useFlightLookup(_flightIata: string, _selectedDate?: Date): UseFlightLookupReturn {
  return {
    isLoading: false,
    error: null,
    result: null,
    notFound: false,
    autofilledFields: new Set<string>(),
    clearAutofill: () => {},
  };
}
