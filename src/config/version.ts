// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.180';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'Parking en vivo: el parking de la cabecera de la escala ahora se puede tocar para consultarlo en ARION al momento. Fuerza la sincronización, actualiza el dato y avisa del cambio (por ejemplo "Parking cambiado: 14 → T17"), marcando remoto o terminal según corresponda.',
  'Parking en vivo: mientras una escala del día está abierta y sin calzos de salida, la app revisa el parking cada 5 minutos y avisa si ARION lo ha cambiado — pensado para los cambios de última hora cuando el puesto está ocupado.',
  'Autocompletado: la búsqueda del vuelo en ARION ya no exige que el número esté escrito exactamente igual (ceros a la izquierda, espacios). Corrige casos como Azul (AD8754) en los que no se rellenaba el parking.',
];
