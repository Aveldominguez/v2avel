/**
 * Cuántas subidas de adjuntos hay en marcha ahora mismo.
 *
 * Los tres apartados que suben archivos (hoja de carga, adjuntar file y fotos
 * de observaciones) están en componentes distintos y el botón de Guardar vive
 * en otro sitio. Un contador de módulo evita tener que hacer llegar ese estado
 * a mano por media pantalla, que era la razón de que Guardar no se enterase de
 * que aún había subidas a medias.
 */

let enCurso = 0;
const oyentes = new Set<(n: number) => void>();

const avisar = () => oyentes.forEach(f => f(enCurso));

export const uploadStarted = (): void => { enCurso += 1; avisar(); };

export const uploadFinished = (): void => {
  enCurso = Math.max(0, enCurso - 1);
  avisar();
};

export const getUploadsInFlight = (): number => enCurso;

export const subscribeUploads = (f: (n: number) => void): (() => void) => {
  oyentes.add(f);
  f(enCurso);
  return () => { oyentes.delete(f); };
};

/** Sólo para los tests: deja el contador a cero entre casos. */
export const __resetUploadTracker = (): void => { enCurso = 0; avisar(); };
