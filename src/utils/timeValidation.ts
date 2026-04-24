import { TurnaroundTimes, TimeValidationError } from '@/types/turnaround';

// Parse time string to minutes for comparison
const parseTimeToMinutes = (time: string | null): number | null => {
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

// Validate time coherence
export const validateTimes = (times: TurnaroundTimes): TimeValidationError[] => {
  const errors: TimeValidationError[] = [];

  // Helper to compare times — handles day rollover (e.g. start 23:50, end 00:10 next day)
  // If end < start, we assume the end happened on the next day, as long as the
  // implied gap is operationally plausible (<= 12h). Otherwise it's an error.
  const checkOrder = (
    startField: keyof TurnaroundTimes,
    endField: keyof TurnaroundTimes,
    startLabel: string,
    endLabel: string
  ) => {
    const startMinutes = parseTimeToMinutes(times[startField] as string | null);
    const endMinutes = parseTimeToMinutes(times[endField] as string | null);

    if (startMinutes === null || endMinutes === null) return;

    if (startMinutes > endMinutes) {
      // Assume rollover: add 24h to end
      const adjustedEnd = endMinutes + 24 * 60;
      const gapMinutes = adjustedEnd - startMinutes;
      // If the gap is more than 12h, treat as invalid input rather than a rollover
      if (gapMinutes > 12 * 60) {
        errors.push({
          field: endField,
          message: `${endLabel} debe ser posterior a ${startLabel}`,
        });
      }
    }
  };

  // Validate unloading times
  checkOrder('unloadingStart', 'unloadingEnd', 'Inicio Descarga', 'Fin Descarga');

  // Validate loading times
  checkOrder('loadingStart', 'loadingEnd', 'Inicio Carga', 'Fin Carga');

  // Validate chocks
  checkOrder('chocksOnArrival', 'chocksOff', 'Calzos Llegada', 'Calzos Salida');

  // Validate unloading before loading (if both exist)
  checkOrder('unloadingEnd', 'loadingStart', 'Fin Descarga', 'Inicio Carga');

  // Validate stairs after arrival
  checkOrder('chocksOnArrival', 'stairsTime', 'Calzos Llegada', 'Puesta Escalera');

  // Validate jardinera sequence
  checkOrder('busArrival', 'bus2', '1ª Jardinera', '2ª Jardinera');
  checkOrder('bus2', 'bus3', '2ª Jardinera', '3ª Jardinera');
  checkOrder('bus3', 'bus4', '3ª Jardinera', '4ª Jardinera');
  checkOrder('bus4', 'bus5', '4ª Jardinera', '5ª Jardinera');
  checkOrder('bus5', 'bus6', '5ª Jardinera', '6ª Jardinera');

  return errors;
};

// Get current timestamp as HH:MM
export const getCurrentTimeString = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

// Format date for display
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Format datetime for display
export const formatDateTime = (date: Date): string => {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
