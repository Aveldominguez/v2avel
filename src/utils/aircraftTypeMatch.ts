/**
 * Cruce entre el tipo de avión que publica ARION y los modelos que la app
 * tiene dados de alta para cada aerolínea.
 *
 * ARION usa códigos IATA de tres caracteres ("738", "32N", "73H") y cada
 * aerolínea de la app tiene su propia lista de modelos, que no siempre baja al
 * mismo detalle: unas distinguen el 737-800 del genérico y otras sólo tienen
 * "B737". El cruce era exacto, así que un Pegasus con un 737-800 (el avión más
 * habitual de la compañía) no encontraba nada: ARION decía "738", la lista de
 * Pegasus tiene "B737" y la escala se quedaba sin modelo.
 *
 * Ahora cada código IATA lleva una cadena de candidatos del más específico al
 * más genérico, y se coge el primero que esa aerolínea tenga. Nunca se escoge
 * un modelo de otra familia: si no hay nada de la familia, no se rellena.
 */

export interface ModelLike {
  model: string;
  label: string;
}

/** Candidatos por código IATA, del más específico al más genérico. */
const FAMILIAS: Record<string, string[]> = {
  // Airbus
  '319': ['A319'], 'A319': ['A319'], '31A': ['A319'],
  '320': ['A320', 'A320_AIRBALTIC'], '32A': ['A320', 'A320_AIRBALTIC'],
  '32N': ['A320', 'A320_AIRBALTIC'], 'A20N': ['A320', 'A320_AIRBALTIC'],
  'A320': ['A320', 'A320_AIRBALTIC'],
  '321': ['A321', 'A321_XLR', '321_GRANEL'], '32B': ['A321', 'A321_XLR', '321_GRANEL'],
  '32Q': ['A321', 'A321_XLR', '321_GRANEL'], 'A21N': ['A321', 'A321_XLR', '321_GRANEL'],
  'A321': ['A321', 'A321_XLR', '321_GRANEL'], '32S': ['A321', 'A321_XLR'],
  '221': ['A220', 'A220-300'], 'BCS1': ['A220', 'A220-300'],
  '223': ['A220-300', 'A220'], '22B': ['A220-300', 'A220'], 'BCS3': ['A220-300', 'A220'],
  'A220': ['A220', 'A220-300'],
  '333': ['A333'], 'A333': ['A333'],
  '339': ['A339'], 'A339': ['A339'],
  // Boeing 737: el -800 cae al genérico "B737" cuando la aerolínea no lo separa
  '738': ['737-800', 'B737'], '73H': ['737-800', 'B737'], 'B738': ['737-800', 'B737'],
  '7M8': ['737_MAX', 'B737'], '7M9': ['737_MAX', 'B737'], '7M7': ['737_MAX', 'B737'],
  'B38M': ['737_MAX', 'B737'], 'B39M': ['737_MAX', 'B737'],
  '73G': ['B737', 'B737-75C'], '737': ['B737', 'B737-75C'], '73W': ['B737', 'B737-75C'],
  'B737': ['B737', 'B737-75C'], '73S': ['B737', 'B737-75C'],
  '734': ['B734', 'B737'], 'B734': ['B734', 'B737'],
  // Boeing de fuselaje ancho
  '763': ['B767'], '767': ['B767'], '76W': ['B767'], 'B763': ['B767'], 'B767': ['B767'],
  '772': ['B777'], '773': ['B777'], '777': ['B777'], '77W': ['B777'],
  'B772': ['B777'], 'B777': ['B777'],
  '788': ['787-800'], 'B788': ['787-800'],
  '789': ['787-900'], 'B789': ['787-900'],
  // Embraer
  'E90': ['EMB90'], 'E190': ['EMB90'], 'E290': ['EMB90'],
  'E95': ['EMB95'], 'E195': ['EMB95'], 'E295': ['EMB95'],
};

/**
 * Modelo de la aerolínea que corresponde al tipo de ARION, o null si no hay
 * ninguno de su familia. No se devuelve nunca un modelo "por si acaso": más
 * vale dejar el campo vacío que meter un avión que no es.
 */
export function resolveAircraftModel(
  arionType: string | null | undefined,
  models: ModelLike[],
): ModelLike | null {
  const tipo = (arionType ?? '').trim().toUpperCase();
  if (!tipo || models.length === 0) return null;

  // 1. La aerolínea nombra el modelo igual que ARION ("A320", "B734").
  const directo = models.find(
    (m) => m.model.toUpperCase() === tipo || m.label.toUpperCase() === tipo,
  );
  if (directo) return directo;

  // 2. Cadena de candidatos de su familia, del más específico al más genérico.
  for (const candidato of FAMILIAS[tipo] ?? []) {
    const hit = models.find((m) => m.model === candidato);
    if (hit) return hit;
  }

  return null;
}
