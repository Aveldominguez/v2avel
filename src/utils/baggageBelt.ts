/**
 * Sala y cinta de entrega de equipaje.
 *
 * ARION lo publica junto, en `secondaryGateNumber`, como una letra y tres
 * cifras: "N617". La letra no aporta nada al operario. De las cifras, la
 * primera es la sala y las dos últimas la cinta: N617 → sala 6, cinta 17.
 *
 * Comprobado contra los 34 vuelos con dato de un día completo en MAD: todos
 * seguían ese formato (I102…I109 y N608…N617), sin una sola excepción. Aun
 * así se guarda el valor tal cual lo da ARION y se parte sólo al mostrarlo:
 * si algún día aparece otro formato, se arregla la lectura sin resincronizar.
 */

export interface BaggageBelt {
  /** Sala de recogida. */
  sala: string;
  /** Número de cinta. */
  cinta: string;
}

/** "N617" → { sala: '6', cinta: '17' }. `null` si no encaja o viene vacío. */
export function parseBaggageBelt(raw: string | null | undefined): BaggageBelt | null {
  const limpio = (raw ?? '').trim().toUpperCase();
  if (!limpio) return null;

  // Letra opcional por delante y exactamente tres cifras detrás.
  const m = limpio.match(/^[A-Z]*(\d)(\d{2})$/);
  if (!m) return null;

  return { sala: m[1], cinta: m[2] };
}

/** "Sala 6 · Cinta 17", o null si no hay dato utilizable. */
export function formatBaggageBelt(raw: string | null | undefined): string | null {
  const b = parseBaggageBelt(raw);
  // Se quitan los ceros de delante: la cinta "02" se lee "Cinta 2".
  return b ? `Sala ${b.sala} · Cinta ${Number(b.cinta)}` : null;
}
