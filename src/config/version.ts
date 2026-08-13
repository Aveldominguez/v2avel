// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.280';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'URGENTE: corregido el fallo por el que la pantalla de inicio de sesión se quedaba parpadeando sin parar y no dejaba entrar en la app. Ocurría cuando la app no lograba comprobar a qué módulos tienes acceso (por ejemplo con mala cobertura): lo interpretaba como "sin acceso" y entraba en un rebote infinito entre el login y la pantalla inicial.',
  'Ahora, si no se puede comprobar el acceso, la app lo dice claramente y ofrece Reintentar o Cerrar sesión, en lugar de dejarte atrapado. Ninguna escala ni dato se ha visto afectado.',
];
