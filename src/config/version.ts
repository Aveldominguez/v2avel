// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.690';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'Arreglado: el generador de informes se salía de la pantalla en el móvil cuando ya había informes guardados, y los campos de fecha y ubicación se montaban uno sobre otro.',
  'En el móvil la fecha y la ubicación van una debajo de otra; en tablet y ordenador siguen lado a lado.',
  'La lista de informes guardados enseña sólo la primera línea, la fecha y el lugar, que es lo que hace falta para reconocerlos.',
  'El mismo fallo estaba latente en todas las ventanas emergentes de la app: cualquiera con un texto largo podía desbordarse. Corregido de raíz.',
];
