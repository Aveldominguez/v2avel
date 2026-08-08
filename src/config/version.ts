// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.160';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'ITA Airways: el número del vuelo de salida se componía mal (AZ063 se guardaba como "AZ0063") porque el prefijo de la compañía termina en cero y se le volvía a añadir el cero del número. Afectaba a cualquier aerolínea con prefijo acabado en dígito.',
  'Vuelo de salida: como ese número no existía en ARION, la escala se quedaba sin estación de destino y por eso no aparecía la animación del avión rojo en las escalas de ITA. Corregido de raíz.',
  'Vuelo de salida: si el número de salida no cuadra con ARION, la escala ahora localiza el vuelo por la conexión que indica la propia llegada. La ruta y la animación aparecen aunque el número esté escrito de otra forma — también en las escalas ya guardadas.',
];
