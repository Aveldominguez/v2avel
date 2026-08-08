// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.170';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'Nueva Escala: el campo "Tango" pasa a llamarse "Parking" en el formulario, en la cabecera de la escala, en el reporte de fallos y en el PDF.',
  'Nueva Escala: el Parking se muestra tal cual lo publica ARION — "T14" si es de terminal y "14" si es remoto — así se identifica de un vistazo y sale igual en el PDF.',
  'Nueva Escala: "En Remoto" se marca solo. Regla: parking sin "T" delante = remoto; los parkings 70, 71, 72, 73 y 74 quedan exentos porque son de terminal con finger. Se aplica al autocompletar desde ARION, al refrescar el parking y al escribirlo a mano, y activa los campos y equipos de remoto sin tocar nada.',
  'Nueva Escala: el Parking ya no se borra al marcar "En Remoto" — antes desaparecía la casilla y había que volver a teclear el número. Ahora es una sola casilla que se mantiene, y el interruptor se puede seguir cambiando a mano cuando haga falta.',
  'Botón de refrescar parking: no encontraba nunca el vuelo porque filtraba por usuario y los vuelos de ARION se guardan como datos compartidos. Corregido.',
];
