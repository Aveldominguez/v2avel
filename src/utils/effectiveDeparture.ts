/**
 * Hora de salida real de una escala, la que vale para contar el tiempo.
 *
 * La hora prevista (ETD de ARION o escrita a mano) deja de servir en cuanto el
 * avión llega tarde: nadie va a salir a las 19:35 si ha calzado a las 19:30 y
 * la aerolínea tiene 40 min de escala. Todo lo que cuente tiempo en la app
 * —cronómetro y aviso de cierre de bodegas— usa esto para no dar dos horas de
 * salida distintas en la misma pantalla.
 */

/** "14:35" → Date de hoy; si quedó a más de 12 h de distancia, es de otro día. */
export const parseClockTime = (hhmm: string, now: Date): Date | null => {
  if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  if (d.getTime() < now.getTime() - 12 * 60 * 60 * 1000) d.setDate(d.getDate() + 1);
  else if (d.getTime() > now.getTime() + 12 * 60 * 60 * 1000) d.setDate(d.getDate() - 1);
  return d;
};

export interface EffectiveDeparture {
  salida: Date;
  /** Sale de calzos + escala porque el avión llegó tarde, no de la prevista. */
  porEscala: boolean;
}

/**
 * Se coge la más TARDÍA entre la prevista y calzos + escala programada.
 *
 * Llegar tarde corre la salida; llegar pronto NO la adelanta, porque el avión
 * no se va antes de su hora aunque la escala termine antes. Con una sola de
 * las dos, manda la que haya.
 */
export const effectiveDeparture = (
  prevista: Date | null,
  calzosLlegada: Date | null,
  turnaroundMinutes: number | null | undefined,
): EffectiveDeparture | null => {
  const porEscala = calzosLlegada && turnaroundMinutes && turnaroundMinutes > 0
    ? new Date(calzosLlegada.getTime() + turnaroundMinutes * 60_000)
    : null;

  if (porEscala && (!prevista || porEscala.getTime() > prevista.getTime())) {
    return { salida: porEscala, porEscala: true };
  }
  return prevista ? { salida: prevista, porEscala: false } : null;
};
