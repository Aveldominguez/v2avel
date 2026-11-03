import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { buildStoragePath } from '@/utils/storageUrl';
import { toast } from '@/hooks/use-toast';
import { saveImageBackup, removeImageBackup } from '@/utils/imageBackupStore';
import { compressImage } from '@/utils/imageCompressor';
import { uploadStarted, uploadFinished } from '@/lib/uploadTracker';

export interface PendingUpload {
  localUrl: string;   // blob: URL for instant preview
  file: File;
  status: 'uploading' | 'done' | 'error';
  serverPath?: string; // set once uploaded
  backupId?: string;   // IndexedDB backup key
}

interface UseBackgroundUploadOptions {
  bucket: string;
  filePrefix: string;
  maxFiles: number;
  turnaroundId?: string;
  serverUrls: string[];
  onUrlsChange: (urls: string[]) => void;
}

export function useBackgroundUpload({
  bucket,
  filePrefix,
  maxFiles,
  turnaroundId,
  serverUrls,
  onUrlsChange,
}: UseBackgroundUploadOptions) {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const uploadQueueRef = useRef<PendingUpload[]>([]);
  const isProcessingRef = useRef(false);
  const serverUrlsRef = useRef(serverUrls);
  serverUrlsRef.current = serverUrls;

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      pending.forEach(p => URL.revokeObjectURL(p.localUrl));
    };
  }, []); // intentionally empty - cleanup on unmount only

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || !user) return;
    isProcessingRef.current = true;

    while (uploadQueueRef.current.length > 0) {
      const item = uploadQueueRef.current[0];
      if (!item) break;

      try {
        const ext = item.file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/${turnaroundId || 'new'}-${filePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

        const { error } = await supabase.storage
          .from(bucket)
          .upload(fileName, item.file, {
            upsert: true,
            contentType: item.file.type || 'image/jpeg',
          });

        if (error) throw error;

        const serverPath = buildStoragePath(bucket, fileName);
        item.serverPath = serverPath;
        item.status = 'done';

        // Remove backup from IndexedDB on success
        if (item.backupId) {
          removeImageBackup(item.backupId).catch(() => {});
        }

        const currentUrls = serverUrlsRef.current;
        onUrlsChange([...currentUrls, serverPath]);

        setPending(prev => prev.filter(p => p.localUrl !== item.localUrl));
        URL.revokeObjectURL(item.localUrl);
      } catch (err) {
        console.error('Background upload error:', err);
        item.status = 'error';
        setPending(prev => prev.map(p => p.localUrl === item.localUrl ? { ...p, status: 'error' } : p));
        toast({ title: 'Error', description: `No se pudo subir ${item.file.name}. La imagen se guardó localmente.`, variant: 'destructive' });
      }

      uploadQueueRef.current = uploadQueueRef.current.slice(1);
      uploadFinished();
    }

    isProcessingRef.current = false;
  }, [user, bucket, filePrefix, turnaroundId, onUrlsChange]);

  const addFiles = useCallback(async (files: File[]) => {
    if (!user) {
      toast({ title: 'Error', description: 'Debes iniciar sesión', variant: 'destructive' });
      return;
    }

    const currentTotal = serverUrls.length + pending.filter(p => p.status !== 'error').length;
    const remaining = maxFiles - currentTotal;
    if (remaining <= 0) {
      toast({ title: 'Límite alcanzado', description: `Máximo ${maxFiles} archivos`, variant: 'destructive' });
      return;
    }

    const validFiles = files.filter(f => {
      if (f.size > 10 * 1024 * 1024) {
        toast({ title: 'Error', description: `${f.name} supera 10MB, omitido`, variant: 'destructive' });
        return false;
      }
      // Android entrega a veces un archivo de cero bytes cuando la foto vive
      // en la nube (Google Fotos) y todavía no se ha descargado al móvil. Si
      // se sube, queda una imagen rota que nadie puede abrir.
      if (f.size === 0) {
        toast({
          title: 'Esa foto no está en el móvil',
          description: `${f.name || 'La foto'} parece estar sólo en la nube. Ábrela antes en la galería o usa la cámara.`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    const batch = validFiles.slice(0, remaining);
    if (batch.length < files.length) {
      toast({ title: 'Aviso', description: `Solo se subirán ${batch.length} de ${files.length} archivos (límite ${maxFiles})` });
    }

    /*
     * Cada foto se mete en la lista EN CUANTO está lista, no al final.
     *
     * Antes se preparaban todas y sólo entonces se pintaban: con cinco fotos
     * no se veía nada hasta que la última terminaba, y si una se atascaba no
     * aparecía ninguna. Ahora van saliendo de una en una y, si una falla,
     * las demás siguen su camino.
     */
    let añadidas = 0;
    for (const original of batch) {
      try {
        // Se comprime en el móvil (lienzo, sin red) para aguantar la
        // cobertura de plataforma. Si no se puede, se sube el original.
        let file = original;
        try {
          file = await compressImage(original);
        } catch (e) {
          console.warn('Image compression failed, using original:', e);
        }

        const backupId = `${turnaroundId || 'new'}-${filePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const localUrl = URL.createObjectURL(file);

        // Copia de seguridad en el móvil por si la subida falla.
        try {
          await saveImageBackup({
            id: backupId,
            turnaroundId: turnaroundId || 'new',
            filePrefix,
            fileName: file.name,
            blob: file,
            createdAt: Date.now(),
          });
        } catch (e) {
          console.warn('Could not save image backup to IndexedDB:', e);
        }

        const item: PendingUpload = { localUrl, file, status: 'uploading', backupId };
        setPending(prev => [...prev, item]);
        uploadStarted();
        uploadQueueRef.current = [...uploadQueueRef.current, item];
        añadidas += 1;
        processQueue();
      } catch (e) {
        // Una foto que no se puede ni preparar no se lleva por delante al
        // resto, y se dice cuál ha sido.
        console.error('[subida] no se pudo preparar la foto', original.name, e);
        toast({
          title: 'Una foto no se pudo añadir',
          description: original.name,
          variant: 'destructive',
        });
      }
    }

    if (añadidas === 0 && batch.length > 0) {
      toast({
        title: 'No se pudo añadir ninguna foto',
        description: 'Inténtalo de nuevo o usa la cámara.',
        variant: 'destructive',
      });
    }
  }, [user, serverUrls.length, pending, maxFiles, processQueue, turnaroundId, filePrefix]);

  const removePending = useCallback((localUrl: string) => {
    const item = pending.find(p => p.localUrl === localUrl);
    if (item?.backupId) {
      removeImageBackup(item.backupId).catch(() => {});
    }
    URL.revokeObjectURL(localUrl);
    setPending(prev => prev.filter(p => p.localUrl !== localUrl));
    const seguiaEnCola = uploadQueueRef.current.some(p => p.localUrl === localUrl);
    uploadQueueRef.current = uploadQueueRef.current.filter(p => p.localUrl !== localUrl);
    if (seguiaEnCola) uploadFinished();
  }, [pending]);

  const retryFailed = useCallback((localUrl: string) => {
    setPending(prev => prev.map(p =>
      p.localUrl === localUrl ? { ...p, status: 'uploading' as const } : p
    ));
    const item = pending.find(p => p.localUrl === localUrl);
    if (item) {
      item.status = 'uploading';
      uploadStarted();
      uploadQueueRef.current.push(item);
      processQueue();
    }
  }, [pending, processQueue]);

  const isUploading = pending.some(p => p.status === 'uploading');

  return {
    pending,
    addFiles,
    removePending,
    retryFailed,
    isUploading,
  };
}
