import { supabase } from '@/integrations/supabase/client';

/**
 * Normaliza un número de vuelo para compararlo con lo que publica ARION:
 * sin espacios, en mayúsculas y sin ceros a la izquierda en la parte numérica
 * ("AZ 059", "AZ059" y "AZ59" son el mismo vuelo).
 */
export const normalizeFlightNumber = (fn: string): string => {
  const clean = (fn ?? '').replace(/\s+/g, '').toUpperCase();
  const m = clean.match(/^([A-Z]+)0*(\d+)$/);
  return m ? `${m[1]}${m[2]}` : clean;
};

/**
 * Variantes de un número de vuelo para el filtro del servidor. El cruce fino
 * se hace luego en cliente con normalizeFlightNumber.
 */
export const flightNumberVariants = (fn: string): string[] => {
  const out = new Set<string>();
  const raw = (fn ?? '').trim();
  if (!raw) return [];
  const clean = raw.replace(/\s+/g, '').toUpperCase();
  out.add(raw);
  out.add(clean);
  const m = clean.match(/^([A-Z]+)0*(\d+)$/);
  if (m) {
    const [, letters, digits] = m;
    out.add(`${letters}${digits}`);
    out.add(`${letters}0${digits}`);
    out.add(`${letters}${digits.padStart(3, '0')}`);
    out.add(`${letters}${digits.padStart(4, '0')}`);
  }
  return Array.from(out);
};

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

  // Sin filtro por user_id: la sincronización del sistema guarda los vuelos con
  // user_id NULL para que los vean todos los usuarios aprobados.
  const { data, error } = await supabase
    .from('scheduled_flights')
    .select('flight_number, parking_code, synced_at')
    .in('flight_number', variants)
    .eq('flight_date', dateISO)
    .eq('movement_type', 'A')
    .order('synced_at', { ascending: false });
  if (error || !data || data.length === 0) return null;

  const target = normalizeFlightNumber(clean);
  const row = data.find((r) => normalizeFlightNumber(String(r.flight_number ?? '')) === target);
  const code = (row?.parking_code ?? '').toString().replace(/\s+/g, '').toUpperCase();
  return code || null;
}
