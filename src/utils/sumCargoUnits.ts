/*
 * Cuenta de maletas a partir de lo que se escribe a mano en una bodega.
 *
 * Lo que NO son maletas y por tanto no suma:
 *  - Mercancía por peso o por piezas: «130kg», «1500 KG», «45PC», «1pc».
 *  - Equipaje de tripulación: «8 Crew», «CREW 8». No entra en el recuento
 *    general porque no es equipaje de pasaje; va aparte en la hoja de carga.
 *
 * Un sufijo que no sea de esos conserva el número: «23BY» son 23.
 *
 * Cada «crew» etiqueta UN número, no todos los que vengan detrás. En
 * «8 crew 6 BY» la tripulación son los 8 y las maletas son 6: si el «crew»
 * valiera también para el 6, el recuento se quedaría corto, que es el error
 * que peor sienta en una hoja de carga.
 */

/** Mercancía pegada al número: «130kg», «45PC». Nunca es equipaje. */
const MERCANCIA = /^\s*(kg|pc)/i;

/** «crew» justo detrás del número, que es como viene en la hoja. */
const CREW_DETRAS = /^(\s*)crew\b/i;

/** «crew» justo delante del número: «CREW 8», «CREW BAGS 8». */
const CREW_DELANTE = /\bcrew\b[^0-9]{0,6}$/i;

interface Numero {
  valor: number;
  inicio: number;
  fin: number;
}

const numerosDe = (texto: string): Numero[] => {
  const regex = /\d+/g;
  const fuera: Numero[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(texto)) !== null) {
    fuera.push({ valor: parseInt(m[0], 10), inicio: m.index, fin: m.index + m[0].length });
  }
  return fuera;
};

/**
 * Qué números hay que contar y cuáles no.
 *
 * Dos pasadas a propósito: primero se reparten los «crew» que van pegados
 * detrás de un número, y sólo los que queden sin dueño pueden etiquetar al
 * número que tienen delante. Así un mismo «crew» no anula dos recuentos.
 */
const numerosQueCuentan = (texto: string): Numero[] => {
  const nums = numerosDe(texto);
  const descartados = new Set<number>();
  const crewUsados = new Set<number>();

  nums.forEach((n, i) => {
    const resto = texto.slice(n.fin);
    if (MERCANCIA.test(resto)) {
      descartados.add(i);
      return;
    }
    const m = CREW_DETRAS.exec(resto);
    if (m) {
      descartados.add(i);
      crewUsados.add(n.fin + m[1].length);
    }
  });

  nums.forEach((n, i) => {
    if (descartados.has(i)) return;
    const previo = texto.slice(0, n.inicio);
    const m = CREW_DELANTE.exec(previo);
    if (!m) return;
    const posicionCrew = previo.toLowerCase().lastIndexOf('crew');
    if (crewUsados.has(posicionCrew)) return;
    descartados.add(i);
    crewUsados.add(posicionCrew);
  });

  return nums.filter((_, i) => !descartados.has(i));
};

export const sumNumericTokens = (text: string): number => {
  if (!text) return 0;
  return numerosQueCuentan(text).reduce((total, n) => total + n.valor, 0);
};

// Primer número del texto, con las mismas exclusiones. Se usa en las bodegas
// paletizadas (AKE/AKH/PAG), donde sólo el número de cabeza son maletas:
// «9BP 3AVI 150KG» -> 9.
export const firstNumericToken = (text: string): number => {
  if (!text) return 0;
  return numerosQueCuentan(text)[0]?.valor ?? 0;
};
