/**
 * ¿Es un nombre de coordinador lo que ARION deja en el «breve comentario»?
 *
 * ARION no tiene un campo para el coordinador: éste escribe su nombre en
 * `shortRemark`, que es texto libre. Comprobado en vivo sobre diez vuelos de
 * un día real en MAD: cuatro traían un nombre (IGNACIO, DAVID, FEDERICO,
 * SOFIA), cinco venían vacíos y uno traía «2AD015859», que es una referencia
 * y no una persona.
 *
 * Por eso el valor se filtra antes de darlo por bueno. Ante la duda se
 * descarta: la casilla se puede escribir a mano, y en la hoja de Control de
 * Rampa es peor imprimir una referencia como coordinador que dejar el hueco.
 */

/** Más largo que esto no es el nombre con el que firma nadie. */
const MAX_LARGO = 30;

export const nombreCoordinador = (bruto: string | null | undefined): string | null => {
  const v = (bruto ?? '').trim().replace(/\s+/g, ' ');
  if (!v || v.length > MAX_LARGO) return null;
  // Un nombre no lleva cifras; una referencia de carga, casi siempre sí.
  if (/\d/.test(v)) return null;
  return v.toUpperCase();
};
