/**
 * Comprime una imagen antes de subirla.
 *
 * Objetivo: 1920 px en el lado mayor. Se guarda en WebP, que a la misma
 * vista pesa bastante menos que el JPEG, y se cae a JPEG en el navegador
 * que no sepa codificarlo. Una foto de móvil de 4-8 MB se queda en 200-450
 * KB en WebP, frente a los 300-700 KB que daba el JPEG.
 *
 * El lado mayor NO se baja de 1920: estas fotos son de hojas de carga con
 * letra pequeña que luego hay que poder leer, y ahorrar espacio a costa de
 * no distinguir un número de contenedor sería cambiar un problema por otro
 * peor.
 */

/**
 * Tope de espera para decodificar la imagen.
 *
 * Es lo que arregla el fallo de las fotos en Android: al elegir de la galería
 * con Chrome, el navegador entrega archivos que a veces NO disparan ni
 * `onload` ni `onerror` —fotos HEIC de las que la galería no da una versión
 * convertida, imágenes enormes, o archivos que en realidad viven en Google
 * Fotos o Drive y llegan a medias—. Sin tope, la promesa se quedaba colgada
 * para siempre; y como las fotos se procesan una detrás de otra, UNA sola
 * bloqueaba a todas las demás: se elegían cinco y no aparecía ninguna, sin un
 * solo aviso.
 *
 * Pasado el tope se sigue con el archivo original: subir una foto pesada es
 * mucho mejor que no subir nada.
 */
const TOPE_DECODIFICAR_MS = 10_000;

/** Calidad de guardado. La de WebP rinde como un JPEG bastante más alto. */
const CALIDAD_WEBP = 0.82;
const CALIDAD_JPEG = 0.88;

/** Archivos que son una imagen aunque Android no diga de qué tipo son. */
const pareceImagen = (file: File): boolean =>
  file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|gif|bmp|avif)$/i.test(file.name);

export async function compressImage(file: File): Promise<File> {
  if (!pareceImagen(file)) return file;
  if (file.size < 500 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    let terminado = false;

    /** Resuelve una sola vez y suelta siempre el blob y el reloj. */
    const terminar = (resultado: File) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(reloj);
      URL.revokeObjectURL(url);
      // Cortar la descarga: en Android una imagen a medias sigue ocupando.
      img.src = '';
      resolve(resultado);
    };

    const reloj = setTimeout(() => {
      console.warn(`[imagen] ${file.name} no se pudo decodificar en ${TOPE_DECODIFICAR_MS} ms; se sube tal cual`);
      terminar(file);
    }, TOPE_DECODIFICAR_MS);

    img.onload = () => {
      const MAX = 1920;
      let { width, height } = img;
      if (!width || !height) { terminar(file); return; }

      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { terminar(file); return; }
        ctx.drawImage(img, 0, 0, width, height);

        /*
         * Se intenta WebP antes que JPEG.
         *
         * Al mismo ojo, un WebP pesa entre un tercio y la mitad menos que el
         * JPEG equivalente. En fotos de hoja de carga, que es casi todo lo
         * que se sube, eso son cientos de megas al año de diferencia en el
         * servidor sin perder un ápice de legibilidad.
         *
         * Un navegador que no sepa codificar WebP NO avisa: devuelve un PNG
         * y se queda tan ancho, y un PNG de una foto pesa MÁS que el
         * original. Por eso se comprueba el tipo de lo que vuelve y, si no
         * es WebP, se rehace en JPEG como siempre.
         */
        const guardar = (blob: Blob | null, extension: string, siguiente?: () => void) => {
          if (!blob || blob.type !== `image/${extension}` || blob.size >= file.size) {
            if (siguiente) { siguiente(); return; }
            terminar(file);
            return;
          }
          terminar(new File([blob], file.name.replace(/\.[^.]+$/, `.${extension}`), {
            type: `image/${extension}`,
            lastModified: Date.now(),
          }));
        };

        const enJpeg = () =>
          canvas.toBlob((blob) => guardar(blob, 'jpeg'), 'image/jpeg', CALIDAD_JPEG);

        canvas.toBlob((blob) => guardar(blob, 'webp', enJpeg), 'image/webp', CALIDAD_WEBP);
      } catch (e) {
        // Lienzo demasiado grande para el móvil: se sube el original.
        console.warn('[imagen] no se pudo redimensionar, se sube tal cual', e);
        terminar(file);
      }
    };

    img.onerror = () => terminar(file);
    img.src = url;
  });
}
