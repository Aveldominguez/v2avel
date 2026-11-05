// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.790';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  "IMPORTANTE: la app ya no puede borrarte las horas de una escala. Antes de guardar comprueba lo que hay en el servidor y, si el cambio haría desaparecer horas ya guardadas, se detiene y te avisa. Si has sido tú quien las ha quitado, pulsa Guardar y confirma.",
  "Si abres una escala y la app no ha podido comprobarla con el servidor, no sube nada sola: te lo dice y espera a que pulses Guardar. Así se perdieron unas horas y no volverá a pasar.",
  "Al abrir la app ya no aparece la pantalla en blanco mientras carga: se ve el fondo de la app y el indicador desde el primer instante.",
  "La cabecera enseñaba como STD la hora del vuelo de llegada. Ahora pone la del vuelo de salida, que es la que vale, y añade la ETD cuando ARION la tiene.",
];
