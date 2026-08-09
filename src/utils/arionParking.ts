import { supabase } from '@/integrations/supabase/client';
import { normalizeFlightNumber, flightNumberVariants } from './flightNumber';

// Se reexportan para no romper los imports existentes.
export { normalizeFlightNumber, flightNumberVariants };

/**
 * Lee de la copia local de ARION el parking asignado a un vuelo de llegada.
 * Devuelve el código tal cual lo publica ARION ("T14", "14"…) o null si el
 * vuelo no está o todavía no tiene parking asignado.
 */
export async function fetchParkingFromArion(
  flightNumber: string,
  dateISO: string,
): Promise<string | null> {
  const clean = (flightNumber ?? '').trim();
  if (!clean) return null;
  const variants = flightNumberVariants(clean);
  if (variants.length === 0) return null;

  // Se miran también los días adyacentes: la jornada operativa de ARION se
  // solapa con el día siguiente y hay filas antiguas archivadas con la fecha
  // en que se sincronizó en lugar del día en que vuela el avión.
  const [y, m, d] = dateISO.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  const toIso = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const prev = new Date(base); prev.setDate(prev.getDate() - 1);
  const next = new Date(base); next.setDate(next.getDate() + 1);
  const ddmmyyyy = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;

  // Sin filtro por user_id: la sincronización del sistema guarda los vuelos con
  // user_id NULL para que los vean todos los usuarios aprobados.
  const { data, error } = await supabase
    .from('scheduled_flights')
    .select('flight_number, parking_code, synced_at, sdt, flight_date')
    .in('flight_number', variants)
    .in('flight_date', [toIso(prev), dateISO, toIso(next)])
    .eq('movement_type', 'A')
    .order('synced_at', { ascending: false });
  if (error || !data || data.length === 0) return null;

  const target = normalizeFlightNumber(clean);
  const candidates = data
    .filter((r) => normalizeFlightNumber(String(r.flight_number ?? '')) === target)
    // El vuelo es el de este día: se decide por la hora programada real (sdt),
    // no por la fecha con la que quedó archivada la fila.
    .filter((r) => {
      const sdt = String(r.sdt ?? '');
      return sdt ? sdt.startsWith(ddmmyyyy) : r.flight_date === dateISO;
    });
  if (candidates.length === 0) return null;

  // De todas las filas de ese vuelo, la más reciente que ya tenga parking:
  // ARION lo asigna ~1 h antes y las sincronizaciones previas lo dejan vacío.
  const withParking = candidates.find(
    (r) => String(r.parking_code ?? '').trim() !== '',
  );
  const code = (withParking?.parking_code ?? '').toString().replace(/\s+/g, '').toUpperCase();
  return code || null;
}
