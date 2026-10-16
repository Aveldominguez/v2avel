// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.670';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'Arreglado del todo el inicio de escala por el vuelo de salida: al pulsar «Continuar con el vuelo» saltaba «Campo requerido · Ingrese el número de vuelo» aunque la escala estuviera entera. Ahora sirve cualquiera de los dos números, también al guardar.',
  'Si falta algo, el aviso dice qué falta: el modelo se señala en su propio campo y el número de vuelo admite el de llegada o el de salida.',
];
