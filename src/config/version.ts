// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.110';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'Buscar Escala: al entrar en una escala y volver atrás, la lista vuelve exactamente a la posición por donde ibas navegando — mismas escalas cargadas y mismo punto de scroll — en vez de empezar desde el principio.',
  'Reporte de fallos: nuevo botón 🐞 en la cabecera de cada escala para reportar un fallo de la app. El reporte queda ligado al vuelo (aerolínea, modelo, fecha, matrícula, tango/remoto) e incluye descripción y hasta 3 capturas de pantalla.',
  'Reporte de fallos: nuevo apartado en el panel de administración para gestionar los reportes — ver la escala del usuario, abrir capturas y marcar como resuelto. El usuario ve el estado (Pendiente / ✅ Resuelto) y recibe un aviso cuando su reporte se resuelve.',
  'Vuelo de salida: la animación del avión con la ruta de salida no aparecía en algunas aerolíneas (p. ej. ITA) — la búsqueda del vuelo de salida en ARION ahora tolera diferencias de formato del número de vuelo (ceros a la izquierda, espacios) y salidas que cruzan la medianoche.',
];
