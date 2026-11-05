import {
  AIRLINES, getTimeFieldsForAirline, getPushBackField, TIME_FIELD_FALLBACK_LABELS,
} from '@/types/turnaround';

/**
 * Nombre legible de un campo de horas: `chocksOnArrival` → "Calzos Llegada".
 *
 * Hace falta para hablar de un campo fuera de su formulario —el panel de
 * recuperación de datos enseña horas de cualquier aerolínea—, y las etiquetas
 * ya existen repartidas por aerolínea. Se recogen de ahí en vez de copiarlas:
 * una lista aparte se quedaría vieja en cuanto alguien renombre un campo.
 */
const mapa = (() => {
  const m = new Map<string, string>();
  const anotar = (campos: { key: string; label: string }[]) => {
    for (const c of campos) if (!m.has(c.key)) m.set(c.key, c.label);
  };
  for (const a of AIRLINES) {
    for (const remoto of [false, true]) {
      anotar(getTimeFieldsForAirline(a.code, remoto));
      anotar(getTimeFieldsForAirline(a.code, remoto, true));
      anotar(getTimeFieldsForAirline(a.code, remoto, false, true));
    }
  }
  anotar([getPushBackField()]);
  // Campos que sólo aparecen con una configuración concreta: ahí están todos.
  for (const [clave, etiqueta] of Object.entries(TIME_FIELD_FALLBACK_LABELS)) {
    if (!m.has(clave)) m.set(clave, etiqueta);
  }
  return m;
})();

/** Si el campo no está en ningún formulario, se devuelve su clave tal cual. */
export const etiquetaDeHora = (clave: string): string => mapa.get(clave) ?? clave;
