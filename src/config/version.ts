// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.430';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'La app ya distingue quedarse sin cobertura de tener red pero no llegar al servidor. Antes, con un bloqueo del operador el móvil tenía 5G, la app se creía conectada y fallaba sin explicar nada.',
  'Cuando no se llega al servidor sale un aviso claro y se sugiere cambiar de wifi a datos móviles, que es lo que suele arreglarlo porque el corte lo aplica cada operador por su lado.',
  'Mientras tanto todo se guarda en el móvil y se envía solo en cuanto vuelve el servidor, sin gastar batería reintentando contra una puerta cerrada.',
];
