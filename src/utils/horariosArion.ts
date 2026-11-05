/**
 * Horarios programados que se enseñan en la cabecera de la escala.
 *
 * Cada fila de ARION trae su propia hora (`sdt`) y, además, la del vuelo
 * CONECTADO (`connection_sdt`): en la fila de llegada, la conexión es la
 * salida; en la de salida, la conexión es la llegada.
 *
 * El STD se estaba cogiendo de `connection_sdt` de la fila de SALIDA, que es
 * justo la hora de la llegada. Con el A3700 del 5/11 la cabecera ponía
 * «STA 12:05 · STD 12:05», las dos iguales, cuando la salida programada eran
 * las 13:05. Un operario que mira esa cabecera ve una hora de salida que no
 * tiene nada que ver con la realidad.
 */

export interface FilaArion {
  sdt?: string | null;
  edt?: string | null;
  etd?: string | null;
  connection_sdt?: string | null;
}

/** "05/11/2026 13:05" → "13:05". Devuelve null si no hay hora dentro. */
export const extraerHora = (valor: string | null | undefined): string | null => {
  if (!valor) return null;
  const m = String(valor).match(/(\d{2}:\d{2})$/);
  return m ? m[1] : null;
};

export interface HorariosEscala {
  /** Llegada programada. */
  sta: string | null;
  /** Llegada estimada. */
  eta: string | null;
  /** Salida programada: la hora PROPIA de la fila de salida. */
  std: string | null;
  /** Salida estimada, cuando ARION la revisa. */
  etd: string | null;
}

export const horariosDeArion = (
  llegada: FilaArion | null | undefined,
  salida: FilaArion | null | undefined,
): HorariosEscala => ({
  sta: extraerHora(llegada?.sdt),
  eta: extraerHora(llegada?.edt),
  // De la fila de salida, SU hora. Si no hay fila de salida, la conexión que
  // trae la llegada es justo la salida, y entonces sí vale.
  std: extraerHora(salida?.sdt) ?? extraerHora(llegada?.connection_sdt),
  etd: extraerHora(salida?.etd) ?? extraerHora(salida?.edt),
});
