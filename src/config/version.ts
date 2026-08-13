// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.290';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'Panel de administración — Reportes de fallos: al pulsar una captura no ocurría nada. La app pedía primero el permiso de acceso a la imagen y luego intentaba abrir una pestaña, y el navegador lo bloqueaba por considerarlo una ventana emergente. Ahora la captura se abre dentro de la propia página, con un enlace para verla a tamaño completo si hace falta.',
];
