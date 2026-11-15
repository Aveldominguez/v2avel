/**
 * Los aeropuertos del mundo con código IATA, para saber de dónde viene un
 * vuelo sin tener que buscarlo fuera.
 *
 * Los datos salen de OurAirports (dominio público) y están en
 * `aeropuertos.txt`, una línea por aeropuerto: IATA|OACI|nombre|ciudad|país.
 * En texto plano y no en JSON porque son 9.000 entradas y las comillas y
 * llaves de JSON costarían 100 KB de nada.
 *
 * Para actualizarlos, mirar scripts/actualizar-aeropuertos.md.
 *
 * El fichero NO se precarga con la app: se baja la primera vez que alguien
 * toca un código y se queda guardado. Así quien no lo use no paga 170 KB, y
 * quien lo use los paga una sola vez.
 */

export interface Aeropuerto {
  iata: string;
  icao: string;
  nombre: string;
  ciudad: string;
  /** Código ISO de dos letras: el nombre del país lo pone el móvil. */
  pais: string;
}

let mapa: Map<string, Aeropuerto> | null = null;
let cargando: Promise<Map<string, Aeropuerto>> | null = null;

const parsear = (datos: string): Map<string, Aeropuerto> => {
  const m = new Map<string, Aeropuerto>();
  for (const linea of datos.split('\n')) {
    const [iata, icao, nombre, ciudad, pais] = linea.split('|');
    if (iata && nombre) m.set(iata, { iata, icao: icao ?? '', nombre, ciudad: ciudad ?? '', pais: pais ?? '' });
  }
  return m;
};

const cargar = async (): Promise<Map<string, Aeropuerto>> => {
  if (mapa) return mapa;
  // Una sola carga aunque lo pidan varios a la vez.
  if (!cargando) {
    cargando = import('./aeropuertos.txt?raw').then((m) => {
      mapa = parsear(m.default);
      return mapa;
    });
  }
  return cargando;
};

/** El aeropuerto de un código IATA, o null si no se conoce. */
export const buscarAeropuerto = async (iata: string | null | undefined): Promise<Aeropuerto | null> => {
  const codigo = (iata ?? '').trim().toUpperCase();
  if (codigo.length !== 3) return null;
  try {
    return (await cargar()).get(codigo) ?? null;
  } catch {
    // Sin cobertura y sin haberlo bajado antes: se queda en el código a secas.
    return null;
  }
};

/**
 * El nombre del país en castellano, sin guardarlo.
 *
 * Lo sabe el propio navegador, así que guardar 9.000 veces "España" sería
 * tirar sitio. Si no lo supiera, se queda el código, que ya dice algo.
 */
export const nombreDePais = (iso: string): string => {
  if (!iso) return '';
  try {
    // fallback 'code': un código que el móvil no conozca se queda tal cual,
    // en vez de salir como una frase genérica que no dice nada.
    return new Intl.DisplayNames(['es'], { type: 'region', fallback: 'code' }).of(iso) ?? iso;
  } catch {
    return iso;
  }
};

/** "Turín-Caselle · Caselle Torinese, Italia" */
export const describirAeropuerto = (a: Aeropuerto): string => {
  const lugar = [a.ciudad, nombreDePais(a.pais)].filter(Boolean).join(', ');
  return lugar ? `${a.nombre} · ${lugar}` : a.nombre;
};
