import { supabase } from '@/integrations/supabase/client';
import { buildStoragePath } from '@/utils/storageUrl';
import { getBackupImages, removeImageBackup } from '@/utils/imageBackupStore';
import {
  classifyOrphans, emptyOrphans, countOrphans,
  SECTION_BY_PREFIX, type Orphans, type OrphanSection, type StorageObject,
} from '@/utils/orphanUploads';

/** Cubos donde viven los adjuntos de una escala. */
const BUCKETS = ['turnaround-files', 'loading-sheets'] as const;

/**
 * Busca en el almacenamiento archivos de esta escala que la escala no
 * referencia: subidas que salieron bien pero cuyo enlace nunca se guardó.
 */
export async function findOrphanAttachments(
  turnaroundId: string,
  userId: string,
  recorded: string[],
): Promise<Orphans> {
  const objetos: StorageObject[] = [];

  for (const bucket of BUCKETS) {
    const { data, error } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
    if (error || !data) continue;
    // `list` devuelve el nombre sin la carpeta; se recompone la ruta completa.
    data.forEach(o => objetos.push({ name: `${userId}/${o.name}`, bucket }));
  }

  return classifyOrphans(objetos, recorded, turnaroundId);
}

/**
 * Reintenta subir las copias locales que quedaron pendientes.
 *
 * Estas copias se guardaban en el navegador desde el principio, pero no había
 * nada que volviera a leerlas: el aviso decía "la imagen se guardó localmente"
 * y en realidad no se podía recuperar de ninguna manera.
 */
export async function retryLocalBackups(
  turnaroundId: string,
  userId: string,
): Promise<Orphans> {
  const recuperados = emptyOrphans();
  let copias: Awaited<ReturnType<typeof getBackupImages>> = [];
  try {
    copias = await getBackupImages(turnaroundId);
  } catch {
    return recuperados;
  }

  for (const copia of copias) {
    const seccion = SECTION_BY_PREFIX[copia.filePrefix as keyof typeof SECTION_BY_PREFIX] as OrphanSection | undefined;
    if (!seccion) continue;

    const bucket = copia.filePrefix === 'ls' ? 'loading-sheets' : 'turnaround-files';
    const ext = copia.fileName.split('.').pop() || 'jpg';
    const ruta = `${userId}/${turnaroundId}-${copia.filePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(ruta, copia.blob, { upsert: true });
    if (error) continue; // Se deja la copia para el siguiente intento.

    recuperados[seccion].push(buildStoragePath(bucket, ruta));
    removeImageBackup(copia.id).catch(() => undefined);
  }

  return recuperados;
}

/** Junta dos conjuntos de recuperados sin repetir. */
export const mergeOrphans = (a: Orphans, b: Orphans): Orphans => ({
  observationPhotos: [...new Set([...a.observationPhotos, ...b.observationPhotos])],
  fileUrls: [...new Set([...a.fileUrls, ...b.fileUrls])],
  loadingSheetUrls: [...new Set([...a.loadingSheetUrls, ...b.loadingSheetUrls])],
});

export { countOrphans, emptyOrphans };
export type { Orphans };
