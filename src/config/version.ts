// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.530';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'Se acabó el aviso de «almacenamiento lleno». El logo de cada aerolínea se guardaba repetido dentro de cada escala: 55 escalas ocupaban 1,5 MB sólo de logos duplicados y llenaban el cupo que el navegador da a la app. Ahora se guarda uno por aerolínea: un 90% menos.',
  'Las escalas de más de 45 días dejan de guardarse en el móvil, salvo las que aún no se hayan sincronizado, que no se borran nunca.',
];
