// Cruce entre el nombre de aerolínea que publica ARION y el catálogo de la app.
//
// ARION no usa códigos IATA: escribe nombres libres y con formatos dispares
// ("AJET", "WIZZ AIR MALTA", "ALBA STAR S.A.", "AZUL BRAZILIAN AIRLI"…). El
// cruce se hacía comparando cadenas tal cual, así que "AJET" no encontraba
// "A Jet" por el espacio y la escala se quedaba sin aerolínea, sin modelo y
// sin matrícula.

export interface AirlineLike {
  code: string;
  name: string;
  shortName?: string;
  /**
   * Código IATA de la compañía (el prefijo de sus números de vuelo: PC, TP,
   * W6…). ARION no siempre manda el nombre: en algunos vuelos manda sólo este
   * código, y entonces es lo único con lo que se puede cruzar.
   */
  prefix?: string;
}

/** Deja solo letras y números en mayúsculas: "Alba Star S.A." → "ALBASTARSA". */
export const normalizeAirlineName = (s: string): string =>
  (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Distancia de edición entre dos cadenas, con tope: en cuanto se pasa de
 * `tope` se deja de calcular y se devuelve tope + 1. Sirve para aguantar las
 * erratas de ARION sin ponerse a comparar nombres que no se parecen en nada.
 */
export const editDistance = (a: string, b: string, tope: number): number => {
  if (Math.abs(a.length - b.length) > tope) return tope + 1;
  let fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const nueva = [i];
    let mejor = i;
    for (let j = 1; j <= b.length; j++) {
      const coste = a[i - 1] === b[j - 1] ? 0 : 1;
      nueva[j] = Math.min(fila[j] + 1, nueva[j - 1] + 1, fila[j - 1] + coste);
      if (nueva[j] < mejor) mejor = nueva[j];
    }
    if (mejor > tope) return tope + 1;
    fila = nueva;
  }
  return fila[b.length];
};

/** Erratas que se toleran según lo largo que sea el nombre. */
const erratasPermitidas = (largo: number): number => (largo >= 10 ? 2 : largo >= 6 ? 1 : 0);

// Por debajo de esta longitud no se acepta una coincidencia parcial: "A" o "AC"
// aparecen dentro de media lista y cruzarían con la compañía equivocada.
const MIN_PARCIAL = 4;

/**
 * Busca la aerolínea del catálogo que corresponde al nombre de ARION.
 * Devuelve su código interno, o null si no hay una coincidencia fiable.
 */
export function matchAirlineByArionName<T extends AirlineLike>(
  arionName: string,
  airlines: T[],
): T | null {
  const arion = normalizeAirlineName(arionName);
  if (!arion) return null;

  const candidatos = airlines.map((a) => ({
    a,
    code: normalizeAirlineName(a.code),
    name: normalizeAirlineName(a.name),
    short: normalizeAirlineName(a.shortName ?? ''),
    prefix: normalizeAirlineName(a.prefix ?? ''),
  }));

  // 1. Coincidencia exacta con el código, el nombre o el nombre corto.
  const exacto = candidatos.find(
    (c) => arion === c.code || arion === c.name || (c.short && arion === c.short),
  );
  if (exacto) return exacto.a;

  // 2. Código IATA de la compañía ("PC" = Pegasus). Cuando ARION manda el
  //    código en vez del nombre no hay nada más con lo que cruzar, y por abajo
  //    no entra: con dos letras no se permite coincidencia parcial.
  //    Sólo vale si ese código es de UNA sola compañía: "AC" es a la vez Air
  //    Canada y Air Canada Cargo, y ahí es mejor no rellenar que acertar a
  //    medias. Tampoco valen los de una letra (Aegean "A", Wizz "W"), que
  //    cruzarían con cualquier cosa.
  if (arion.length >= 2) {
    const porCodigo = candidatos.filter((c) => c.prefix.length >= 2 && c.prefix === arion);
    if (porCodigo.length === 1) return porCodigo[0].a;
  }

  // 3. Parcial: ARION suele añadir el país o la forma jurídica ("WIZZ AIR MALTA",
  //    "ALBA STAR S.A."), o recortar el nombre ("AZUL BRAZILIAN AIRLI").
  //    Se prefiere la coincidencia más larga, que es la más específica.
  //    Se exige longitud mínima EN AMBOS lados: con un nombre de ARION de una
  //    o dos letras, cualquier compañía lo contiene y resolvería una al azar.
  if (arion.length < MIN_PARCIAL) return null;

  const parciales = candidatos
    .flatMap((c) => {
      const claves = [c.name, c.short, c.code].filter((k) => k.length >= MIN_PARCIAL);
      const hit = claves.find((k) => arion.includes(k) || k.includes(arion));
      return hit ? [{ a: c.a, peso: hit.length }] : [];
    })
    .sort((x, y) => y.peso - x.peso);

  if (parciales[0]) return parciales[0].a;

  // 4. Último recurso: el nombre de ARION trae una errata. Caso real: publica
  //    "PEGAGUS AIRLINES", con G en vez de S, y así ni coincide entero ni se
  //    contiene por ningún lado, de modo que esos vuelos se quedaban sin
  //    aerolínea, sin modelo y sin matrícula.
  //
  //    Se admite una letra de diferencia (dos en nombres largos) y se exige
  //    que gane UNA sola compañía: si dos quedan a la misma distancia no se
  //    elige a cara o cruz, se deja vacío.
  const cercanos = candidatos
    .flatMap((c) => {
      const claves = [c.name, c.short, c.code].filter((k) => k.length >= 6);
      const distancias = claves.map((k) => {
        const tope = erratasPermitidas(Math.max(k.length, arion.length));
        return tope === 0 ? Infinity : editDistance(arion, k, tope);
      });
      const mejor = Math.min(...distancias, Infinity);
      const tope = erratasPermitidas(arion.length);
      return mejor <= tope ? [{ a: c.a, dist: mejor }] : [];
    })
    .sort((x, y) => x.dist - y.dist);

  if (cercanos.length === 1) return cercanos[0].a;
  if (cercanos.length > 1 && cercanos[0].dist < cercanos[1].dist) return cercanos[0].a;

  return null;
}
