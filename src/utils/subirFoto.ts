import { supabase } from '@/integrations/supabase/client';
import { baseDeR2, buildR2Path, buildStoragePath, hayR2 } from '@/utils/storageUrl';

/**
 * Subir una foto de escala.
 *
 * Desde hoy lo nuevo va a Cloudflare R2, que es lo que detiene el
 * crecimiento de Supabase. Pero con una regla que manda sobre todo lo demás:
 *
 *   **si R2 falla por lo que sea, la foto se sube a Supabase como siempre.**
 *
 * Una foto que no se sube es una foto perdida, y una hoja de carga no se
 * vuelve a hacer: el avión ya se ha ido. Ahorrar espacio nunca puede costar
 * una foto. Por eso R2 es el camino preferido, no el único.
 *
 * La ruta es la misma en los dos sitios (`<usuario>/<fichero>`), así que lo
 * único que cambia es el prefijo que se guarda en la escala.
 */
export interface ResultadoSubida {
  /** Lo que se guarda en la escala: `r2:...` o `cubo:...` */
  ruta: string;
  almacen: 'r2' | 'supabase';
}

/** Cuánto se espera a R2 antes de tirar por Supabase. En rampa hay poca cobertura. */
export const ESPERA_R2 = 20_000;

async function subirAR2(fileName: string, file: Blob): Promise<boolean> {
  const base = baseDeR2();
  if (!base) return false;

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return false;

  const corte = AbortSignal.timeout ? AbortSignal.timeout(ESPERA_R2) : undefined;
  const destino = `${base}/f/${fileName.split('/').map(encodeURIComponent).join('/')}`;
  const r = await fetch(destino, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': file.type || 'image/jpeg' },
    body: file,
    signal: corte,
  });
  return r.ok;
}

export async function subirFoto(
  bucket: string, fileName: string, file: File | Blob,
): Promise<ResultadoSubida> {
  if (hayR2()) {
    try {
      if (await subirAR2(fileName, file)) {
        return { ruta: buildR2Path(fileName), almacen: 'r2' };
      }
      console.warn('[subida] R2 no aceptó la foto, se sube a Supabase');
    } catch (e) {
      // Sin cobertura, con el Worker caído o con el enlace cortado a medias:
      // da igual el motivo, la foto tiene que acabar en algún sitio.
      console.warn('[subida] no se pudo subir a R2, se sube a Supabase', e);
    }
  }

  const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  });
  if (error) throw error;

  return { ruta: buildStoragePath(bucket, fileName), almacen: 'supabase' };
}
