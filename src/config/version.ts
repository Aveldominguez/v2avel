// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.781';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'IMPORTANTE: si guardas una escala con mala cobertura, antes la app decía «guardado» aunque no hubiera llegado al servidor. Ahora lo detecta, lo dice y la reintenta sola. Verás «Guardado localmente, se reintentará» más a menudo: no es que falle más, es que antes fallaba en silencio.',
  'Al abrir la app se rescatan las escalas que se hubieran quedado sólo en el móvil y se suben solas.',
  'Android: arregladas las fotos de la galería que se elegían y no aparecían ni subían. Si una foto da problemas, ahora se dice cuál y las demás siguen.',
  'Air Canada: los contadores de maletas (BF, BY, DOM, USA…) ya se guardan de verdad, con un total al pie. La LIR escaneada ya no puede perderse al reescanear, y el botón Reset pide confirmación.',
];
