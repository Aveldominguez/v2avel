// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.190';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'Parking: corregido el fallo por el que algunos vuelos (Azul AD8754, entre otros) se quedaban sin parking. El mismo vuelo se guardaba dos veces con fechas distintas —una de ellas todavía sin puesto asignado— y la app leía la fila equivocada. Ahora coge siempre el dato más reciente.',
  'Parking: al leer el puesto se ignoran las filas antiguas archivadas con fecha equivocada; el vuelo se identifica por su hora programada real.',
];
