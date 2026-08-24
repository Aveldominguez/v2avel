/**
 * Archivos subidos que la escala no llegó a registrar.
 *
 * La URL de un adjunto sólo entra en la escala cuando la subida termina bien, y
 * hasta que hay un guardado vive únicamente en memoria. Si la escala se recarga
 * antes (se reabre la app, se vuelve al listado y se entra de nuevo), el archivo
 * se queda en el almacenamiento sin que nada apunte a él: el usuario ve que su
 * foto "ha desaparecido" aunque siga estando.
 *
 * Caso real: un adjunto subido a las 19:48 se perdió porque el siguiente
 * guardado llegó 29 minutos después, ya con la escala recargada. Las 9 fotos
 * subidas ese mismo día sobrevivieron porque se guardó 5 segundos más tarde.
 */

/** Sección de la escala a la que pertenece cada adjunto, por su prefijo. */
export const SECTION_BY_PREFIX = {
  obs: 'observationPhotos',
  file: 'fileUrls',
  ls: 'loadingSheetUrls',
} as const;

export type OrphanSection = (typeof SECTION_BY_PREFIX)[keyof typeof SECTION_BY_PREFIX];

export interface StorageObject {
  /** Nombre completo dentro del cubo: "<usuario>/<escala>-<prefijo>-<ts>-<rnd>.jpg" */
  name: string;
  bucket: string;
}

export type Orphans = Record<OrphanSection, string[]>;

export const emptyOrphans = (): Orphans => ({
  observationPhotos: [], fileUrls: [], loadingSheetUrls: [],
});

/**
 * Nombres de archivo que NO son adjuntos de la escala aunque vivan en el mismo
 * cubo y lleven su identificador. Las capturas de los reportes de fallo cuelgan
 * de la tabla de reportes: contarlas como huérfanas ofrecería "recuperar"
 * capturas que ya están donde deben.
 */
const NOT_ATTACHMENTS = ['issue'];

/** "<usuario>/<escala>-<prefijo>-<resto>" → prefijo, o null si no encaja. */
export const prefixOf = (name: string, turnaroundId: string): string | null => {
  const file = name.slice(name.lastIndexOf('/') + 1);
  // Las capturas de reportes anteponen su marca al identificador de la escala.
  const marca = file.slice(0, file.indexOf('-'));
  if (NOT_ATTACHMENTS.includes(marca)) return null;
  if (!file.startsWith(`${turnaroundId}-`)) return null;
  const resto = file.slice(turnaroundId.length + 1);
  const prefijo = resto.slice(0, resto.indexOf('-'));
  return prefijo || null;
};

/**
 * Reparte en secciones los archivos del almacenamiento que la escala no
 * referencia. Devuelve referencias en formato "cubo:ruta", listas para
 * añadirse a la escala tal cual.
 */
export function classifyOrphans(
  objects: StorageObject[],
  recordedRefs: string[],
  turnaroundId: string,
): Orphans {
  const registrados = new Set(recordedRefs.map(r => r.slice(r.indexOf(':') + 1)));
  const out = emptyOrphans();

  for (const o of objects) {
    if (registrados.has(o.name)) continue;
    const prefijo = prefixOf(o.name, turnaroundId);
    if (!prefijo) continue;
    const seccion = SECTION_BY_PREFIX[prefijo as keyof typeof SECTION_BY_PREFIX];
    if (!seccion) continue;
    out[seccion].push(`${o.bucket}:${o.name}`);
  }

  return out;
}

export const countOrphans = (o: Orphans): number =>
  o.observationPhotos.length + o.fileUrls.length + o.loadingSheetUrls.length;
