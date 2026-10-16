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

/**
 * Número con el que se identifica la escala en el historial.
 *
 * Si no hay vuelo de llegada se enseña el de salida, se haya marcado «sólo
 * salida» o no: antes la sustitución dependía de ese interruptor y una escala
 * empezada por el número de salida salía en la lista sin número ninguno.
 */
export const numeroVueloVisible = (
  flightNumber: string | null | undefined,
  departureFlightNumber: string | null | undefined,
): string => (flightNumber?.trim() ? flightNumber : (departureFlightNumber?.trim() || ''));
