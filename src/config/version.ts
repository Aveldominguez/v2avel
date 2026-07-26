// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.100';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'Estilo v4: corregido el contraste en Admin y Control de Equipos (cabeceras, botón Sincronizar ARION y tarjetas ilegibles sobre fondo blanco).',
  'Estilo v4: arreglados los toggles de rol/módulo sin colorear (bug de un selector CSS que corrompía otras reglas al minificar).',
  'Admin: botones de cabecera (Crear Usuario, Catálogos, Mis Escalas, Salir) ahora se ajustan bien en pantallas estrechas.',
  'Corrección más a fondo del fallo que a veces dejaba la lista de escalas en blanco al volver al estilo v4.',
];
