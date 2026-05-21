// Auto-incremented on each meaningful change
export const APP_VERSION = '2.0.116';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  "Apertura de la app drásticamente más rápida: el bundle inicial se redujo de ~1.95 MB a ~95 KB mediante carga diferida de rutas y separación de librerías pesadas.",
  "Las librerías de PDF, escáner de bodegas y exportación ZIP ahora se cargan sólo cuando se usan, no al abrir la app.",
  "El service worker precachea sólo el shell esencial (~780 KB en lugar de ~3 MB), acelerando la primera instalación en iPhone.",
];
