import { supabase } from '@/integrations/supabase/client';
import { baseDeR2 } from '@/utils/storageUrl';

/**
 * Mudar a R2 las fotos que ya están en Supabase.
 *
 * Tres pasos por foto, en este orden y sin saltarse ninguno:
 *
 *   1. copiar a R2, con LA MISMA RUTA
 *   2. comprobar que se lee desde allí
 *   3. sólo entonces, borrar de Supabase
 *
 * Si algo falla por el camino, la foto sigue en Supabase y se ve igual. Lo
 * peor que puede pasar es que acabe en los dos sitios, que no rompe nada.
 *
 * NO se toca ni una escala. La referencia guardada sigue diciendo
 * «loading-sheets:…» y la app, al no encontrarla en Supabase, la busca en R2
 * con la misma ruta. Por eso la mudanza no puede romper una escala: no las
 * escribe. Y por eso tampoco hace falta reescribir el histórico, que además
 * no se puede: el administrador sólo puede verlo y borrarlo.
 */

export interface FotoAMudar {
  bucket: string;
  ruta: string;
  bytes: number;
}

export type Fallo = 'sin-bajar' | 'sin-subir' | 'sin-verificar' | 'sin-borrar';

export interface ResultadoMudanza {
  mudada: boolean;
  fallo?: Fallo;
}

/** Tamaños en cristiano. */
export const enMegas = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;

/** Lo que ocupa una lista de fotos. */
export const totalBytes = (fotos: FotoAMudar[]): number =>
  fotos.reduce((n, f) => n + f.bytes, 0);

/**
 * El tipo de fichero se saca del nombre porque el de R2 lo escribimos
 * nosotros. Una hoja de carga servida como «application/octet-stream» se
 * descarga en vez de verse.
 */
export const tipoPorNombre = (ruta: string): string => {
  const ext = ruta.toLowerCase().split('.').pop() ?? '';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'png') return 'image/png';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'application/octet-stream';
};

const enlace = (ruta: string): string =>
  `${baseDeR2()}/f/${ruta.split('/').map(encodeURIComponent).join('/')}`;

/** Muda una foto. Devuelve en qué paso se quedó si no pudo. */
export async function mudarUna(foto: FotoAMudar): Promise<ResultadoMudanza> {
  const { data: ses } = await supabase.auth.getSession();
  const token = ses.session?.access_token;
  if (!token) return { mudada: false, fallo: 'sin-subir' };
  const cab = { authorization: `Bearer ${token}` };

  // 1. Bajarla de Supabase.
  const { data: fichero, error } = await supabase.storage.from(foto.bucket).download(foto.ruta);
  if (error || !fichero) return { mudada: false, fallo: 'sin-bajar' };

  // 2. Subirla a R2, misma ruta.
  const subida = await fetch(enlace(foto.ruta), {
    method: 'PUT',
    headers: { ...cab, 'content-type': fichero.type || tipoPorNombre(foto.ruta) },
    body: fichero,
  });
  if (!subida.ok) return { mudada: false, fallo: 'sin-subir' };

  // 3. Comprobar que de verdad se lee desde R2 ANTES de borrar nada.
  const firma = await fetch(`${baseDeR2()}/firmar`, {
    method: 'POST',
    headers: { ...cab, 'content-type': 'application/json' },
    body: JSON.stringify({ ruta: foto.ruta, segundos: 120 }),
  });
  if (!firma.ok) return { mudada: false, fallo: 'sin-verificar' };
  const { url } = await firma.json();
  if (!url) return { mudada: false, fallo: 'sin-verificar' };
  const leida = await fetch(url);
  if (!leida.ok) return { mudada: false, fallo: 'sin-verificar' };
  const copia = await leida.blob();
  // Que esté y que pese lo mismo. Media foto subida pesa menos.
  if (copia.size !== fichero.size) return { mudada: false, fallo: 'sin-verificar' };

  // 4. Ahora sí, quitarla de Supabase.
  const { error: errBorrado } = await supabase.storage.from(foto.bucket).remove([foto.ruta]);
  if (errBorrado) return { mudada: false, fallo: 'sin-borrar' };

  return { mudada: true };
}
