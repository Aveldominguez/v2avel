import type { TurnaroundTimes } from '@/types/turnaround';

/**
 * Ediciones de la LIR.
 *
 * La LIR puede reemitirse durante la escala: llega la edición 1, cambia la
 * carga y entregan una edición 2, a veces una 3. Interesa la hora de cada
 * entrega, no sólo la de la primera, porque es lo que acredita cuándo se supo
 * cada cambio.
 *
 * Air Canada tenía para esto un campo suelto, "Recibo Nueva LIR", que sólo
 * servía para una reedición y sólo en esa aerolínea. Se sustituye por esto,
 * que vale para todas y para las ediciones que hagan falta.
 */

/** Claves de las ediciones posteriores a la primera, en orden. */
export const LIR_EXTRA_KEYS = [
  'lirReception2', 'lirReception3', 'lirReception4', 'lirReception5',
] as const;

export type LirExtraKey = (typeof LIR_EXTRA_KEYS)[number];

/** Número total de ediciones posibles, contando la primera. */
export const MAX_LIR_EDITIONS = LIR_EXTRA_KEYS.length + 1;

/** "Recepción de LIR" la primera; "LIR Ed. N" las siguientes. */
export const lirEditionLabel = (edicion: number): string =>
  edicion <= 1 ? 'Recepción de LIR' : `LIR Ed. ${edicion}`;

/**
 * Cuántas ediciones hay que mostrar al abrir la escala.
 *
 * Se mira la última que tenga hora, no cuántas la tengan: si alguien apuntó la
 * edición 3 y dejó la 2 en blanco, esconder la 2 le impediría rellenarla.
 */
export function visibleLirCount(times: Partial<TurnaroundTimes> | null | undefined): number {
  if (!times) return 1;
  let ultima = 1;
  LIR_EXTRA_KEYS.forEach((k, i) => {
    if ((times as Record<string, unknown>)[k]) ultima = i + 2;
  });
  return ultima;
}

/** Ediciones con hora apuntada, para listarlas en el PDF. */
export function filledLirEditions(
  times: Partial<TurnaroundTimes> | null | undefined,
): Array<{ key: LirExtraKey; label: string; value: string }> {
  if (!times) return [];
  return LIR_EXTRA_KEYS.flatMap((k, i) => {
    const v = (times as Record<string, unknown>)[k];
    return typeof v === 'string' && v.trim()
      ? [{ key: k, label: lirEditionLabel(i + 2), value: v }]
      : [];
  });
}
