// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.420';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'El parking deja de cambiarse solo mientras trabajas: en cuanto registras una hora, la app deja de consultarlo en ARION. Si el avión ya está recibido, está en un puesto concreto y de ahí no se mueve.',
  'ARION ya nunca sobrescribe un parking puesto por una persona. Si difiere, lo propone con un aviso y decides tú: cambiarlo o mantener el tuyo.',
  'Si la escala aún no tiene parking, ARION lo sigue rellenando solo como hasta ahora.',
  'El aviso de bodegas cerradas vuelve a verse en las escalas terminadas: la hora de cierre y los minutos de margen quedan en Control de horas para consultarlos cuando haga falta, no sólo el día del vuelo.',
];
