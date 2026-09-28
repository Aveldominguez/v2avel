/**
 * Un logo por aerolínea, no uno por escala.
 *
 * ARION manda el logo como imagen incrustada en texto (data URL) y pesa unos
 * 27 KB. Se guardaba DENTRO de los datos de cada escala, así que el navegador
 * acababa con una copia del mismo logo por cada vuelo atendido: medido en un
 * navegador real, 55 escalas ocupaban 1,5 MB sólo de logos repetidos, el 90%
 * de todo el almacén. Al pasar del límite del navegador dejaba de poder
 * guardarse nada, y de ahí el aviso de "almacenamiento lleno".
 *
 * Guardando uno por aerolínea, esos 1,5 MB se quedan en lo que ocupen las
 * aerolíneas distintas que se hayan atendido, unas decenas de KB.
 */

const KEY = 'airline_logos_v1';

type Mapa = Record<string, string>;

const leer = (): Mapa => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Mapa) : {};
  } catch {
    return {};
  }
};

const escribir = (m: Mapa): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    // Sin sitio: el logo es decorativo, se prescinde de él sin romper nada.
  }
};

export const getAirlineLogo = (airline: string | null | undefined): string | null =>
  (airline && leer()[airline]) || null;

export const setAirlineLogo = (airline: string | null | undefined, logo: string | null | undefined): void => {
  if (!airline || !logo) return;
  const m = leer();
  if (m[airline] === logo) return;
  m[airline] = logo;
  escribir(m);
};

/** Para hacer sitio cuando el navegador se queda sin espacio. */
export const clearAirlineLogos = (): void => {
  try { localStorage.removeItem(KEY); } catch { /* sin almacén */ }
};
