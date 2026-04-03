import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { buildStoragePath } from '@/utils/storageUrl';
import { toast } from '@/hooks/use-toast';

export interface PendingUpload {
  localUrl: string;   // blob: URL for instant preview
  file: File;
  status: 'uploading' | 'done' | 'error';
  serverPath?: string; // set once uploaded
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
  // Keep a ref to the latest serverUrls to avoid stale closures
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
          .upload(fileName, item.file, { upsert: true });

        if (error) throw error;

        const serverPath = buildStoragePath(bucket, fileName);
        item.serverPath = serverPath;
        item.status = 'done';

        // Update parent with the new server path
        const currentUrls = serverUrlsRef.current;
        onUrlsChange([...currentUrls, serverPath]);

        // Remove from pending after a brief moment so transition is smooth
        setPending(prev => prev.filter(p => p.localUrl !== item.localUrl));
        URL.revokeObjectURL(item.localUrl);
      } catch (err) {
        console.error('Background upload error:', err);
        item.status = 'error';
        setPending(prev => prev.map(p => p.localUrl === item.localUrl ? { ...p, status: 'error' } : p));
        toast({ title: 'Error', description: `No se pudo subir ${item.file.name}`, variant: 'destructive' });
      }

      // Remove processed item from queue
      uploadQueueRef.current = uploadQueueRef.current.slice(1);
    }

    isProcessingRef.current = false;
  }, [user, bucket, filePrefix, turnaroundId, onUrlsChange]);

  const addFiles = useCallback((files: File[]) => {
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
      return true;
    });

    const batch = validFiles.slice(0, remaining);
    if (batch.length < files.length) {
      toast({ title: 'Aviso', description: `Solo se subirán ${batch.length} de ${files.length} archivos (límite ${maxFiles})` });
    }

    const newPending: PendingUpload[] = batch.map(file => ({
      localUrl: URL.createObjectURL(file),
      file,
      status: 'uploading' as const,
    }));

    setPending(prev => [...prev, ...newPending]);
    uploadQueueRef.current = [...uploadQueueRef.current, ...newPending];

    // Start processing queue
    processQueue();
  }, [user, serverUrls.length, pending, maxFiles, processQueue]);

  const removePending = useCallback((localUrl: string) => {
    URL.revokeObjectURL(localUrl);
    setPending(prev => prev.filter(p => p.localUrl !== localUrl));
    uploadQueueRef.current = uploadQueueRef.current.filter(p => p.localUrl !== localUrl);
  }, []);

  const retryFailed = useCallback((localUrl: string) => {
    setPending(prev => prev.map(p =>
      p.localUrl === localUrl ? { ...p, status: 'uploading' as const } : p
    ));
    const item = pending.find(p => p.localUrl === localUrl);
    if (item) {
      item.status = 'uploading';
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
