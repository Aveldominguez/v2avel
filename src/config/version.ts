// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.100';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'Crear Usuario: el error real del servidor (ej. "Este email ya está registrado") ya se muestra en el toast, en vez del mensaje genérico "Edge Function returned a non-2xx status code". También se corrige el mínimo de contraseña mostrado (8 caracteres, no 6) y se valida antes de enviar.',
  'Catálogos → Equipos: la tabla de unidades (Código/Etiqueta) tenía columnas tan estrechas en móvil que el texto quedaba invisible — ahora la fila se desplaza horizontalmente en vez de comprimirse.',
  'Catálogos → Modelos: el formulario "Añadir nuevo modelo" ya no solapa las etiquetas (Turnaround/Limpieza) en pantallas estrechas — pasa a 2 columnas en móvil.',
  'Catálogos: la fila de pestañas (Aerolíneas, Modelos, Comoditys…) ya no se solapa en pantallas estrechas — pasa a desplazamiento horizontal en vez de una rejilla fija de 6 columnas.',
  'Verificado con usuario real: contraste de Admin, Equipos, Catálogos y toggles, y el fallo de la lista en blanco al cambiar de tema, ya no reproducen.',
];
