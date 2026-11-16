/**
 * Cuándo se puede empezar a trabajar una escala.
 *
 * El botón «Continuar con la Escala» exigía número de vuelo de LLEGADA, salvo
 * en modo «sólo salida». Desde que la escala se autocompleta también con el
 * número de salida (v4.630) eso dejaba un callejón sin salida: se escribía el
 * vuelo de salida, entraban aerolínea, modelo, matrícula y parking… y el
 * botón seguía apagado, sin decir por qué y sin forma de avanzar.
 *
 * Basta con tener uno de los dos números: el avión es el mismo.
 */

/**
 * ¿Hay un número escrito de verdad?
 *
 * Con aerolínea elegida el campo arranca con su prefijo ya puesto ("TP"), así
 * que no vale mirar si está vacío: hay que comprobar que se escribió algo
 * DESPUÉS del prefijo.
 */
export const tieneNumeroReal = (
  valor: string,
  prefijo: string,
  hayAerolinea: boolean,
): boolean => (hayAerolinea ? valor.length > prefijo.length : valor.trim().length > 0);

export interface InicioEscala {
  flightNumber: string;
  departureFlightNumber: string;
  prefijo: string;
  airline: string;
  soloSalida: boolean;
}

/**
 * Aquí NO se exige el modelo de avión a propósito. Falta de modelo el botón
 * sigue encendido y, al pulsarlo, el propio campo del modelo se señala en
 * rojo: un botón apagado sin explicación es justo lo que dejó al usuario
 * atascado, y repetirlo con el modelo sería el mismo error.
 */
export const puedeContinuar = (e: InicioEscala): boolean => {
  const hayAerolinea = e.airline !== '';
  const llegada = tieneNumeroReal(e.flightNumber, e.prefijo, hayAerolinea);
  const salida = tieneNumeroReal(e.departureFlightNumber, e.prefijo, hayAerolinea);
  return hayAerolinea && (e.soloSalida || llegada || salida);
};

/**
 * ¿La escala tiene con qué identificarse?
 *
 * Vale cualquiera de los dos vuelos. Es la misma pregunta que la del botón
 * de continuar, pero sin el caso de «sólo salida»: ahí el botón deja pasar
 * para que se pueda elegir la aerolínea antes de tener el número, mientras
 * que para avanzar de pantalla y para guardar hace falta un número de verdad,
 * o la escala se queda sin forma de encontrarla luego.
 */
export const hayNumeroDeVuelo = (e: Omit<InicioEscala, 'soloSalida'>): boolean => {
  const hayAerolinea = e.airline !== '';
  return tieneNumeroReal(e.flightNumber, e.prefijo, hayAerolinea) ||
    tieneNumeroReal(e.departureFlightNumber, e.prefijo, hayAerolinea);
};

/** Un número de vuelo lleva cifras; «AD» a secas es sólo el prefijo. */
const llevaCifras = (v: string | null | undefined): boolean => /\d/.test(v ?? '');

/**
 * Número con el que se identifica la escala en el historial.
 *
 * Si no hay vuelo de llegada se enseña el de salida, se haya marcado «sólo
 * salida» o no: antes la sustitución dependía de ese interruptor y una escala
 * empezada por el número de salida salía en la lista sin número ninguno.
 *
 * Y «no hay» incluye tener SÓLO EL PREFIJO. Al elegir aerolínea, el campo de
 * llegada arranca con sus letras ya puestas («AD»), así que una escala de sólo
 * salida se guarda con «AD» de llegada: no está vacío, pero tampoco es un
 * vuelo. Mirando únicamente si había algo escrito, la lista enseñaba «AD» y se
 * comía el número de salida, que era el único que existía.
 */
export const numeroVueloVisible = (
  flightNumber: string | null | undefined,
  departureFlightNumber: string | null | undefined,
): string => {
  const llegada = (flightNumber ?? '').trim();
  const salida = (departureFlightNumber ?? '').trim();
  if (llevaCifras(llegada)) return llegada;
  if (llevaCifras(salida)) return salida;
  // Ninguno es un vuelo de verdad: mejor enseñar el prefijo que un hueco.
  return llegada || salida;
};
