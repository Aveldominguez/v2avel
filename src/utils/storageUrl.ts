import { supabase } from '@/integrations/supabase/client';

// Una escala se trabaja durante horas y luego se consulta: con una hora, las
// miniaturas ya cargadas dejaban de poder abrirse a media escala.
const SIGNED_URL_EXPIRY = 8 * 3600; // 8 h, un turno completo

/**
 * Dónde vive una foto.
 *
 * En la base de datos no se guarda la foto, se guarda su dirección. Hay tres
 * formatos vivos a la vez, por orden de antigüedad:
 *
 *   1. `https://...supabase.co/.../loading-sheets/u1/foto.jpg`  (el más viejo)
 *   2. `loading-sheets:u1/foto.jpg`                             (el de ahora)
 *   3. `r2:u1/foto.webp`                                        (Cloudflare R2)
 *
 * Los tres tienen que entenderse SIEMPRE y a la vez. Una escala de hace seis
 * meses puede tener fotos del formato 1 y una de mañana tenerlas del 3; si la
 * app dejara de entender uno, esas fotos se verían rotas aunque el fichero
 * siga perfectamente guardado. Por eso no se migra ningún formato: se suman.
 */
export const PREFIJO_R2 = 'r2:';

/** El cubo imaginario que representa a R2 dentro de `parseStoragePath`. */
export const ALMACEN_R2 = 'r2';

export const esRutaDeR2 = (value: string): boolean => value.startsWith(PREFIJO_R2);

/**
 * Dirección de la pasarela que sirve las fotos de R2.
 *
 * Va escrita aquí y no en una variable de compilación a propósito: no es un
 * secreto, es una dirección pública, y así no depende de que alguien la
 * escriba bien en un panel. Una errata allí compilaría la app con R2 apagado
 * sin que nadie se entere hasta ir a buscar dónde acabó una foto.
 *
 * `VITE_R2_BASE_URL` sigue mandando si existe, y ponerla VACÍA es el
 * interruptor de emergencia: todo vuelve a Supabase en el siguiente
 * despliegue, sin tocar una línea de código.
 */
export const PASARELA_DE_FOTOS = 'https://fotos.devavel.com';

export const baseDeR2 = (): string => {
  const puesta = import.meta.env.VITE_R2_BASE_URL;
  const bruto = puesta === undefined ? PASARELA_DE_FOTOS : String(puesta);
  return bruto.replace(/\/+$/, '');
};

export const hayR2 = (): boolean => baseDeR2().length > 0;

/**
 * Extract bucket name and path from a stored URL or path string.
 * Supports old public URLs, the "bucket:path" format and R2 ("r2:path").
 */
export function parseStoragePath(value: string): { bucket: string; path: string } | null {
  // R2 va antes que nada: su prefijo también lleva ":" y si no se mirase
  // primero, el formato 2 lo tomaría por un cubo de Supabase llamado "r2".
  if (esRutaDeR2(value)) {
    return { bucket: ALMACEN_R2, path: value.slice(PREFIJO_R2.length) };
  }

  // New format: "bucket:path"
  if (value.includes(':') && !value.startsWith('http')) {
    const idx = value.indexOf(':');
    return { bucket: value.substring(0, idx), path: value.substring(idx + 1) };
  }

  // Legacy: full public URL
  const turnaroundMatch = value.match(/turnaround-files\/(.+?)(?:\?|$)/);
  if (turnaroundMatch) return { bucket: 'turnaround-files', path: turnaroundMatch[1] };

  const loadingMatch = value.match(/loading-sheets\/(.+?)(?:\?|$)/);
  if (loadingMatch) return { bucket: 'loading-sheets', path: loadingMatch[1] };

  return null;
}

/**
 * Pide a la pasarela un enlace temporal para una foto de R2.
 *
 * La sesión viaja en la cabecera, NUNCA en la dirección: una dirección queda
 * escrita en registros, en el historial y en cualquier intermediario, y ahí
 * no puede ir la llave de la sesión de un agente. Lo que devuelve la pasarela
 * es un enlace firmado y de corta vida, que es lo que sí puede ponerse en un
 * `<img>`.
 */
async function firmarEnR2(path: string): Promise<string | null> {
  const base = baseDeR2();
  if (!base) {
    console.warn('[fotos] hay una foto en R2 pero R2 no está configurado todavía');
    return null;
  }
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;

    const respuesta = await fetch(`${base}/firmar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ ruta: path, segundos: SIGNED_URL_EXPIRY }),
    });
    if (!respuesta.ok) {
      console.warn('[fotos] R2 no quiso firmar', path, respuesta.status);
      return null;
    }
    const json = await respuesta.json();
    return typeof json?.url === 'string' ? json.url : null;
  } catch (e) {
    console.warn('[fotos] no se pudo hablar con R2', e);
    return null;
  }
}

/**
 * Create a signed URL from a stored path/URL value.
 * Returns the signed URL or null if it fails.
 */
export async function getSignedUrl(value: string | null): Promise<string | null> {
  if (!value) return null;

  const parsed = parseStoragePath(value);
  if (!parsed) return value; // fallback: return as-is if can't parse

  if (parsed.bucket === ALMACEN_R2) return firmarEnR2(parsed.path);

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, SIGNED_URL_EXPIRY);

  if (error || !data?.signedUrl) {
    /*
     * Puede que la foto ya se haya mudado a R2. Se copia SIEMPRE con la misma
     * ruta, así que buscarla allí con la misma ruta la encuentra.
     *
     * Esto es lo que permite mudar las fotos viejas sin reescribir nada: las
     * copias del histórico siguen apuntando a «loading-sheets:…» y se ven
     * igual. Y el histórico no se puede reescribir —el administrador sólo
     * puede verlo y borrarlo—, así que esta es la única manera de que una
     * copia de hace meses siga enseñando sus fotos después de la mudanza.
     */
    const mudada = await firmarEnR2(parsed.path);
    if (mudada) return mudada;

    console.warn('Failed to create signed URL:', error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Create multiple signed URLs at once.
 */
export async function getSignedUrls(values: string[]): Promise<(string | null)[]> {
  return Promise.all(values.map(v => getSignedUrl(v)));
}

/**
 * Build a storage path string for persisting in the database.
 */
export function buildStoragePath(bucket: string, filePath: string): string {
  return `${bucket}:${filePath}`;
}

/** La dirección de una foto guardada en R2, para escribirla en la escala. */
export function buildR2Path(filePath: string): string {
  return `${PREFIJO_R2}${filePath}`;
}

/**
 * Borra una foto de donde quiera que esté.
 *
 * Antes cada pantalla hacía `supabase.storage.from(bucket).remove(...)` por su
 * cuenta. Con dos almacenes eso se rompe en silencio: una foto de R2 acabaría
 * pidiéndole a Supabase que borre de un cubo llamado «r2» que no existe, el
 * error se tragaría y la foto se quedaría ocupando sitio para siempre.
 *
 * Devuelve true sólo si de verdad se borró.
 */
export async function borrarDelAlmacen(value: string): Promise<boolean> {
  const parsed = parseStoragePath(value);
  if (!parsed) return false;

  if (parsed.bucket === ALMACEN_R2) {
    const base = baseDeR2();
    if (!base) {
      console.warn('[fotos] no se puede borrar de R2: no está configurado');
      return false;
    }
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return false;
      const respuesta = await fetch(`${base}/borrar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ ruta: parsed.path }),
      });
      return respuesta.ok;
    } catch (e) {
      console.warn('[fotos] no se pudo borrar de R2', e);
      return false;
    }
  }

  const { error } = await supabase.storage.from(parsed.bucket).remove([parsed.path]);
  if (error) {
    console.warn('[fotos] no se pudo borrar', value, error);
    return false;
  }
  return true;
}
