/**
 * Recomprimir a WebP las fotos que ya están en el servidor.
 *
 * Las fotos antiguas se guardaron en JPEG a calidad 88 y pesan 500-700 KB.
 * Las mismas, en WebP y a la misma resolución, pesan entre un tercio y la
 * mitad menos sin que se note a la vista. Son cientos de megas sin borrar
 * una sola foto.
 *
 * Tres reglas que no se tocan:
 *
 *  1. Se sube A LA MISMA RUTA. Las escalas y las copias del histórico
 *     apuntan a esa ruta; cambiarla obligaría a reescribir referencias en
 *     dos sitios, y una copia del histórico es una foto fija que no debería
 *     reescribirse. Misma ruta, cero referencias tocadas.
 *  2. No se borra nada, nunca. Si la subida falla, el original sigue donde
 *     estaba: lo peor que puede pasar es que esa foto no adelgace.
 *  3. Sólo se reemplaza si la nueva pesa CLARAMENTE menos. Arriesgar la
 *     calidad de una hoja de carga por ahorrar un 5% no sale a cuenta.
 */

/** La resolución no se baja: hay que poder leer números de contenedor. */
export const LADO_MAXIMO = 1920;

/** Por debajo de esto no hay nada que rascar. */
export const MINIMO_PARA_TOCAR = 150 * 1024;

/** Sólo se reemplaza si la nueva ocupa como mucho este porcentaje. */
export const MEJORA_MINIMA = 0.85;

export const CALIDAD_WEBP = 0.82;

export interface FotoEnServidor {
  bucket: string;
  ruta: string;
  bytes: number;
  tipo?: string | null;
}

export type MotivoSaltada = 'ya-webp' | 'pequena' | 'sin-mejora' | 'error';

export interface ResultadoFoto {
  ruta: string;
  antes: number;
  despues: number;
  reemplazada: boolean;
  motivo?: MotivoSaltada;
}

/** ¿Merece la pena intentarlo siquiera? Evita bajar fotos para nada. */
export const valeLaPenaTocar = (f: FotoEnServidor): boolean => {
  if ((f.tipo ?? '').includes('webp')) return false;
  if (f.ruta.toLowerCase().endsWith('.webp')) return false;
  return f.bytes >= MINIMO_PARA_TOCAR;
};

/** Cuánto se espera ahorrar en total, para enseñarlo antes de empezar. */
export const ahorroEstimado = (fotos: FotoEnServidor[], factor = 0.38): number =>
  Math.round(fotos.filter(valeLaPenaTocar).reduce((n, f) => n + f.bytes, 0) * factor);

/** ¿La nueva versión gana lo bastante como para reemplazar la buena? */
export const mereceReemplazo = (antes: number, despues: number): boolean =>
  despues > 0 && despues <= antes * MEJORA_MINIMA;

export const enMegas = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;

/**
 * Recomprime un blob en el navegador. Devuelve null si no se puede o si no
 * compensa, y en ese caso quien llama deja la foto como estaba.
 */
export const recomprimir = (blob: Blob): Promise<Blob | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    let hecho = false;
    const terminar = (r: Blob | null) => {
      if (hecho) return;
      hecho = true;
      clearTimeout(reloj);
      URL.revokeObjectURL(url);
      img.src = '';
      resolve(r);
    };
    // Una foto rota o enorme puede no disparar ni onload ni onerror y dejar
    // la tanda colgada para siempre. Con tope, como mucho se salta una.
    const reloj = setTimeout(() => terminar(null), 15_000);

    img.onerror = () => terminar(null);
    img.onload = () => {
      let { width, height } = img;
      if (!width || !height) { terminar(null); return; }
      if (width > LADO_MAXIMO || height > LADO_MAXIMO) {
        if (width > height) {
          height = Math.round((height * LADO_MAXIMO) / width);
          width = LADO_MAXIMO;
        } else {
          width = Math.round((width * LADO_MAXIMO) / height);
          height = LADO_MAXIMO;
        }
      }
      try {
        const lienzo = document.createElement('canvas');
        lienzo.width = width;
        lienzo.height = height;
        const ctx = lienzo.getContext('2d');
        if (!ctx) { terminar(null); return; }
        ctx.drawImage(img, 0, 0, width, height);
        lienzo.toBlob(
          (salida) => {
            // Un navegador que no sabe WebP devuelve un PNG sin avisar, y un
            // PNG de una foto pesa MÁS. Se comprueba antes de darlo por bueno.
            if (!salida || salida.type !== 'image/webp') { terminar(null); return; }
            terminar(salida);
          },
          'image/webp',
          CALIDAD_WEBP,
        );
      } catch {
        terminar(null);
      }
    };
    img.src = url;
  });
