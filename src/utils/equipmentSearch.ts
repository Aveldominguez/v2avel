// Búsqueda de equipos por código. Sin dependencias, para poder probarla
// sin base de datos (ver flightNumber.ts para el mismo criterio).

/** "PQ 8501" → "PQ8501": sin espacios ni guiones y en mayúsculas. */
export const normalizeEquipmentCode = (s: string): string =>
  (s ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase();

export interface SearchableUnit {
  id: string;
  code: string;
  label: string;
}

/**
 * Busca equipos por lo que se teclea, pensado para escribir los últimos
 * números del código ("8501" encuentra "PQ 8501"). Las coincidencias que
 * TERMINAN en lo tecleado van primero: al leer el número pintado en la
 * máquina es lo que se busca casi siempre.
 *
 * Con menos de 2 caracteres no devuelve nada, para no listar medio parque.
 */
export function matchEquipment<T extends SearchableUnit>(
  units: T[],
  query: string,
  limit = 8,
): T[] {
  const q = normalizeEquipmentCode(query);
  if (q.length < 2) return [];
  return units
    .filter((u) =>
      normalizeEquipmentCode(u.code).includes(q) ||
      normalizeEquipmentCode(u.label).includes(q))
    .sort((a, b) => {
      const aEnds = normalizeEquipmentCode(a.code).endsWith(q) ? 0 : 1;
      const bEnds = normalizeEquipmentCode(b.code).endsWith(q) ? 0 : 1;
      return aEnds - bEnds || a.code.localeCompare(b.code);
    })
    .slice(0, limit);
}
