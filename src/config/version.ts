// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.100';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'Control de Horas: el botón Guardar de la cabecera se salía del margen en móviles (~412px, p. ej. S24 Ultra) cuando el indicador de conexión mostraba texto como "Sin conexión" o "Sincronizando…". Ahora ese texto sólo aparece en pantallas anchas — se mantienen icono y contador — y el botón nunca se comprime ni desborda.',
  'Home: el aviso de previsión de viento (TAF) pasa de pastilla pequeña a franja a todo el ancho, justo encima del METAR y con su mismo formato — la previsión del día es de lo primero que conviene ver al abrir la app.',
  'Alerta de viento: cuando hay aviso (METAR en vivo o previsión TAF) el botón se pinta entero con el color del nivel — amarillo, naranja o rojo — y late entre ese tono y otro más claro. Antes la previsión sólo se señalaba con un punto diminuto en la esquina, fácil de pasar por alto.',
  'Buscar Escala: nuevo filtro por modelo de avión, para localizar trabajos anteriores con aviones poco habituales o modificados. Lista los modelos de la aerolínea filtrada, o todos si no hay ninguna seleccionada.',
  'Air Est: las escalas ya existentes se renumeran de "AE####" a "AEG####" (llegada y salida), para que el buscador las encuentre al filtrar por esa aerolínea.',
  'Air Est: el prefijo de vuelo pasa de "AE" a "AEG" (siglas correctas de la compañía) al crear una escala nueva.',
  'Pegasus: la categoría "Escaleras" ya aparece siempre en Equipos utilizados, no solo en escalas remotas.',
  'Estilo v4 (Aero): en los diálogos (p. ej. "Comoditys" de Control de Horas) el texto descriptivo se veía gris casi blanco sobre fondo blanco — ahora se lee correctamente en todas las aerolíneas.',
  'Bodegas / AKH: los text areas y campos de contenido ya no saltan el cursor al final al escribir sobre una línea intermedia (bug conocido de teclados móviles con inputs controlados que transforman a mayúsculas en cada tecla).',
  'Escalas "En remoto": el campo "1ª Jardinera" pasa a llamarse "Última Jardinera" y se mueve a Vuelo de salida, justo encima de Inicio Búsqueda Maleta — salvo en "Sólo llegada", donde no hay salida y se mantiene en Vuelo de llegada.',
  'Escalas "Sólo llegada" / "Sólo salida": ya no se quedan marcadas como pendientes al completarse — el estado ahora solo exige los datos del lado que aplica, no ambos.',
  'Estilo v4 (Aero): añadido "Actualizar app" al menú hamburguesa de Home — era el único de los 5 temas sin forma de forzar la actualización. El título de la cabecera pasa de "Ramp Control" a "Control Rampa v4.1" (versión dinámica).',
  'Estilo Sky: se corrige el bug que dejaba la Home sin cabecera (sin menú, sin botón de cambiar tema) al entrar en Sky — una regla de CSS de la fusión de Estilo v4 ocultaba la única cabecera que existe para ese tema, dejando la app aparentemente bloqueada al no poder tocar nada arriba.',
  'Crear Usuario / Cambiar contraseña: corregido el parseo del error del servidor — buscaba el cuerpo de la respuesta en error.context.response, pero la librería de Supabase la pone directamente en error.context. Por eso nunca se veía el motivo real (ej. "Este email ya está registrado") y siempre salía el mensaje genérico.',
  'Catálogos → Equipos: la tabla de unidades (Código/Etiqueta) tenía columnas tan estrechas en móvil que el texto quedaba invisible — ahora la fila se desplaza horizontalmente en vez de comprimirse.',
  'Catálogos → Modelos: el formulario "Añadir nuevo modelo" ya no solapa las etiquetas (Turnaround/Limpieza) en pantallas estrechas — pasa a 2 columnas en móvil.',
  'Catálogos: la fila de pestañas (Aerolíneas, Modelos, Comoditys…) ya no se solapa en pantallas estrechas — pasa a desplazamiento horizontal en vez de una rejilla fija de 6 columnas.',
  'Verificado con usuario real: contraste de Admin, Equipos, Catálogos y toggles, y el fallo de la lista en blanco al cambiar de tema, ya no reproducen.',
];
