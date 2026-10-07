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

  return parciales[0]?.a ?? null;
}
