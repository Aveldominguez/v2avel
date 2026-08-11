// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.221';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  'Home: el aviso de previsión TAF ya no tapa el botón "Ver más escalas". El hueco inferior se ajusta solo a la altura real del bloque de meteorología, así que cuando aparece el aviso el contenido se desplaza hacia arriba en lugar de quedar oculto.',
  'Home: la previsión TAF y el METAR se muestran unidos en una sola tarjeta, cada uno con su etiqueta, en vez de dos avisos sueltos que parecían cosas distintas.',
  'Equipos — Modo Revisión: nueva función para recorrer el aeropuerto y registrar los equipos desde un solo sitio. Buscas por los últimos números del equipo, anotas parking y batería, y un contador te dice cuántos llevas y cuáles faltan, por categoría.',
  'Equipos — Modo Revisión: varios compañeros pueden revisar a la vez categorías distintas. Si coincidís en una, la app avisa de quién la está revisando y ofrece uniros a la misma revisión o repartiros las categorías.',
];
