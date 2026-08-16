// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.350';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'Informe de incidente: se genera con más definición (captura a 3x en lugar de 2x). Si el móvil no puede con esa resolución, vuelve solo a la anterior en vez de sacar la hoja en blanco.',
  'Informe de incidente: el PDF pasa de más de 10 MB a unos 0,2 MB. La imagen se incrustaba sin comprimir; ahora se comprime sin pérdida de calidad.',
];
