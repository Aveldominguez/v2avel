import { useCallback, useEffect, useState } from 'react';
import { FileWarning, Loader2, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  findOrphanAttachments, retryLocalBackups, mergeOrphans, countOrphans, emptyOrphans,
  type Orphans,
} from '@/utils/attachmentRecovery';

interface AttachmentRecoveryProps {
  turnaroundId?: string;
  loadingSheetUrls: string[];
  fileUrls: string[];
  observationPhotos: string[];
  onRecover: (recuperados: Orphans) => void;
}

/**
 * Avisa de adjuntos que están subidos pero no figuran en la escala, y permite
 * devolverlos con un toque.
 *
 * La URL de un adjunto sólo entra en la escala cuando la subida termina, y
 * hasta que hay un guardado vive en memoria. Si la escala se recargaba antes,
 * el archivo quedaba en el servidor sin que nada apuntase a él y el usuario lo
 * daba por perdido. Esto lo detecta al abrir y lo ofrece de vuelta.
 */
export const AttachmentRecovery: React.FC<AttachmentRecoveryProps> = ({
  turnaroundId, loadingSheetUrls, fileUrls, observationPhotos, onRecover,
}) => {
  const { user } = useAuth();
  const [encontrados, setEncontrados] = useState<Orphans>(emptyOrphans);
  const [recuperando, setRecuperando] = useState(false);

  const registrados = [...loadingSheetUrls, ...fileUrls, ...observationPhotos];
  const clave = registrados.join('|');

  useEffect(() => {
    if (!turnaroundId || !user) return;
    let cancelado = false;
    (async () => {
      try {
        const r = await findOrphanAttachments(turnaroundId, user.id, registrados);
        if (!cancelado) setEncontrados(r);
      } catch {
        // Sin conexión no se puede comprobar; se reintenta al volver a abrir.
      }
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnaroundId, user?.id, clave]);

  const recuperar = useCallback(async () => {
    if (!turnaroundId || !user) return;
    setRecuperando(true);
    try {
      // Se aprovecha para reintentar también lo que nunca llegó a subir.
      const deCopias = await retryLocalBackups(turnaroundId, user.id);
      const todo = mergeOrphans(encontrados, deCopias);
      const n = countOrphans(todo);
      if (n === 0) {
        toast({ title: 'Nada que recuperar' });
      } else {
        onRecover(todo);
        setEncontrados(emptyOrphans());
        toast({
          title: `${n} ${n === 1 ? 'archivo recuperado' : 'archivos recuperados'}`,
          description: 'Ya están en la escala y se han guardado.',
        });
      }
    } catch (e) {
      toast({
        title: 'No se pudieron recuperar',
        description: e instanceof Error ? e.message : 'Inténtalo de nuevo con mejor cobertura.',
        variant: 'destructive',
      });
    } finally {
      setRecuperando(false);
    }
  }, [turnaroundId, user, encontrados, onRecover]);

  const total = countOrphans(encontrados);
  if (total === 0) return null;

  const detalle = [
    encontrados.observationPhotos.length && `${encontrados.observationPhotos.length} de observaciones`,
    encontrados.fileUrls.length && `${encontrados.fileUrls.length} de adjuntar file`,
    encontrados.loadingSheetUrls.length && `${encontrados.loadingSheetUrls.length} de hoja de carga`,
  ].filter(Boolean).join(' · ');

  return (
    <div className="rounded-lg border-2 border-amber-500 bg-amber-500/15 p-3 text-amber-700 dark:text-amber-400">
      <div className="flex items-start gap-2">
        <FileWarning size={20} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {total === 1
              ? 'Hay 1 archivo subido que no está en la escala'
              : `Hay ${total} archivos subidos que no están en la escala`}
          </p>
          <p className="text-sm opacity-90">{detalle}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={recuperar}
        disabled={recuperando}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border-2 border-current bg-background/60 py-2 font-semibold disabled:opacity-60"
      >
        {recuperando ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
        {recuperando ? 'Recuperando…' : 'Recuperar archivos'}
      </button>
    </div>
  );
};
