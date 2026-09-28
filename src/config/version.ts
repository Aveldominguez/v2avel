// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.570';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'El aviso de bodegas cerradas ya no muestra márgenes absurdos como «1386 min». Cuando el avión llegaba con retraso, la hora de salida prevista quedaba por detrás de los calzos y la app la tomaba por la del día siguiente, así que el margen salía de casi 24 horas.',
  'Ahora sólo se considera del día siguiente si de verdad se cruzó la medianoche; un retraso se trata como lo que es.',
];
