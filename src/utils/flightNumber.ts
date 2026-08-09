// Utilidades puras de números de vuelo.
//
// Viven aparte de arionParking.ts a propósito: ese módulo importa el cliente de
// Supabase, que exige las variables de entorno al cargarse. Manteniendo estas
// funciones sin dependencias se pueden usar (y testear) sin base de datos.

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
