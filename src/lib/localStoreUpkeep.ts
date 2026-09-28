/**
 * Mantenimiento del almacén local de escalas: qué se conserva y qué sobra.
 *
 * El almacén crecía sin límite —una entrada por escala, para siempre— y el
 * navegador tiene un tope por sitio web de unos pocos MB. Nadie consulta sin
 * conexión una escala de hace meses, pero una escala sin sincronizar NO se
 * puede tirar aunque sea vieja: es trabajo que todavía no ha llegado al
 * servidor.
 */

/** Días de escalas que se conservan para poder consultarlas sin conexión. */
export const LOCAL_KEEP_DAYS = 45;

export interface Podable {
  date: string;            // ISO yyyy-mm-dd
  _pendingSync?: boolean;
}

/** Se queda con lo reciente y con todo lo que aún no ha subido al servidor. */
export function pruneByAge<T extends Podable>(
  lista: T[],
  hoy: Date,
  dias: number = LOCAL_KEEP_DAYS,
): T[] {
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() - dias);
  const limiteIso = limite.toISOString().slice(0, 10);
  return lista.filter(e => e._pendingSync === true || (e.date ?? '') >= limiteIso);
}
