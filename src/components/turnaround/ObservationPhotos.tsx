import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Camera, ImageIcon, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { DeletePhotoButton } from './DeletePhotoButton';
import { parseStoragePath, getSignedUrl } from '@/utils/storageUrl';
import { useBackgroundUpload } from '@/hooks/useBackgroundUpload';

const MAX_PHOTOS = 7;

interface ObservationPhotosProps {
  turnaroundId?: string;
  photos: string[];
  onChange: (photos: string[]) => void;
}

export const ObservationPhotos: React.FC<ObservationPhotosProps> = ({
  turnaroundId,
  photos,
  onChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [displayUrls, setDisplayUrls] = useState<(string | null)[]>([]);

  const { pending, addFiles, removePending, retryFailed, isUploading } = useBackgroundUpload({
    bucket: 'turnaround-files',
    filePrefix: 'obs',
    maxFiles: MAX_PHOTOS,
    turnaroundId,
    serverUrls: photos,
    onUrlsChange: onChange,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all(photos.map(p => getSignedUrl(p))).then(urls => {
      if (!cancelled) setDisplayUrls(urls);
    });
    return () => { cancelled = true; };
  }, [photos]);

  const handleDelete = async (index: number) => {
    const url = photos[index];
    try {
      const parsed = parseStoragePath(url);
      if (parsed) {
        await supabase.storage.from(parsed.bucket).remove([parsed.path]);
      }
    } catch {}
    onChange(photos.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) addFiles(Array.from(files));
    e.target.value = '';
  };

  const totalCount = photos.length + pending.filter(p => p.status !== 'error').length;
  const canAddMore = totalCount < MAX_PHOTOS;

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Fotografías ({photos.length}/{MAX_PHOTOS})
          {isUploading && <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />}
        </span>
        {canAddMore && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 bg-primary text-primary-foreground border-primary hover:bg-primary/80 hover:border-primary/80"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-3.5 w-3.5" />
              Cámara
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 bg-success text-success-foreground border-success hover:bg-success/80 hover:border-success/80"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Galería
            </Button>
          </div>
        )}
      </div>

      {(photos.length > 0 || pending.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative group">
              <img
                src={displayUrls[i] || ''}
                alt={`Observación ${i + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-border cursor-pointer"
                onClick={() => displayUrls[i] && window.open(displayUrls[i]!, '_blank')}
              />
              <DeletePhotoButton onConfirm={() => handleDelete(i)} />
            </div>
          ))}
          {/* Pending local images */}
          {pending.map((p) => (
            <div key={p.localUrl} className="relative group">
              <img
                src={p.localUrl}
                alt="Subiendo..."
                className={`w-full h-32 object-cover rounded-lg border ${
                  p.status === 'error' ? 'border-destructive opacity-60' : 'border-primary/50 opacity-80'
                }`}
              />
              {p.status === 'uploading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/40 rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              {p.status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-background/40 rounded-lg">
                  <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => retryFailed(p.localUrl)}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="destructive" className="h-6 w-6" onClick={() => removePending(p.localUrl)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
    </div>
  );
};
