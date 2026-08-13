// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.250';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'A Jet: las escalas ya se autocompletan. ARION publica esta compañía como "AJET" sin espacio y en el catálogo figura como "A Jet", así que el cruce fallaba y la escala se quedaba sin aerolínea, sin modelo y sin matrícula.',
  'Autocompletado: el cruce del nombre de aerolínea con ARION ya no depende de espacios, puntos ni guiones ("Alba Star S.A.", "AZUL BRAZILIAN AIRLI", "WIZZ AIR MALTA"…). Comprobado que las nueve aerolíneas que ya funcionaban siguen resolviéndose igual.',
  'Modelo de avión: se reconocen los códigos del Boeing 737 MAX (7M8, 7M9…), que ARION usa en varios vuelos de A Jet y antes dejaban el modelo en blanco.',
  'A Jet — 737-800: corregidas las bodegas, que estaban copiadas de la familia A320. Ahora son las reales: delante compartimientos 1, 1B y 2; detrás 3, 4 y 4B (donde suele ir el flight kit).',
];
