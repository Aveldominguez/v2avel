/**
 * Borradores de escala guardados en el móvil.
 *
 * Vive aparte de `useOfflineSync` a propósito: ese módulo importa el cliente de
 * Supabase, que revienta al cargarse si no hay variables de entorno. Los tests
 * de estos ayudantes se caían en CI por eso, no por un fallo real.
 * Aquí no debe entrar NINGUNA dependencia de red.
 */
import { TurnaroundTimes, AirlineCode, FieldValue } from '@/types/turnaround';

const DRAFT_KEY = 'turnaround_draft';

export interface TurnaroundDraft {
  turnaroundId?: string;
  flightNumber: string;
  date: string;
  airline: AirlineCode;
  aircraftModel: string;
  times: TurnaroundTimes;
  fieldValues: FieldValue[];
  observations: string;
  tango: string;
  matricula: string;
  isRemote: boolean;
  soloLlegada: boolean;
  soloSalida: boolean;
  remoteLocation: string;
  step: number;
  savedAt: number;
}

/**
 * Borradores caducados que se pueden tirar para hacer sitio.
 *
 * Un borrador sólo se borra al guardar la escala: cada escala que se abre y se
 * deja a medias deja el suyo para siempre. Con los meses llenan el almacén del
 * navegador (Safari da ~5 MB por web) y a partir de ahí NINGÚN borrador se
 * guarda: es la causa de que se pierda lo apuntado.
 */
const DRAFT_TTL_MS = 48 * 60 * 60 * 1000;

const draftKeys = (): string[] =>
  Object.keys(localStorage).filter((k) => k.startsWith(`${DRAFT_KEY}_`));

/** Tira los borradores más viejos que `olderThanMs`. Devuelve cuántos ha tirado. */
export const pruneDrafts = (olderThanMs = DRAFT_TTL_MS, keep?: string): number => {
  const limite = Date.now() - olderThanMs;
  let tirados = 0;
  for (const k of draftKeys()) {
    if (keep && k === keep) continue;
    try {
      const d = JSON.parse(localStorage.getItem(k) ?? '{}') as Partial<TurnaroundDraft>;
      // Sin fecha se considera de una versión antigua: también sobra.
      if (!d.savedAt || d.savedAt < limite) {
        localStorage.removeItem(k);
        tirados++;
      }
    } catch {
      localStorage.removeItem(k);
      tirados++;
    }
  }
  return tirados;
};

/**
 * Guarda el borrador. Devuelve `false` SÓLO si no ha podido guardarlo ni
 * después de hacer sitio: quien llama debe avisar al usuario, porque a partir
 * de ese momento lo que apunte no está respaldado en el móvil.
 */
export const saveDraft = (draft: TurnaroundDraft): boolean => {
  const key = draft.turnaroundId ? `${DRAFT_KEY}_${draft.turnaroundId}` : `${DRAFT_KEY}_new`;
  const payload = JSON.stringify(draft);
  try {
    localStorage.setItem(key, payload);
    return true;
  } catch (e) {
    console.warn('Failed to save draft:', e);
  }
  // Almacén lleno: se hace sitio tirando borradores viejos y se reintenta,
  // primero los de más de 48 h y, si aún no cabe, todos menos el de esta escala.
  for (const ttl of [DRAFT_TTL_MS, 0]) {
    try {
      if (pruneDrafts(ttl, key) === 0) continue;
      localStorage.setItem(key, payload);
      return true;
    } catch (e) {
      console.warn('Draft still not saved after pruning:', e);
    }
  }
  return false;
};

export const loadDraft = (turnaroundId?: string): TurnaroundDraft | null => {
  try {
    const key = turnaroundId ? `${DRAFT_KEY}_${turnaroundId}` : `${DRAFT_KEY}_new`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const clearDraft = (turnaroundId?: string) => {
  const key = turnaroundId ? `${DRAFT_KEY}_${turnaroundId}` : `${DRAFT_KEY}_new`;
  localStorage.removeItem(key);
};
