import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, ImageIcon, Trash2, Loader2, FileImage, RefreshCw } from 'lucide-react';
import { DeletePhotoButton } from './DeletePhotoButton';
import { parseStoragePath, getSignedUrl } from '@/utils/storageUrl';
import { useBackgroundUpload } from '@/hooks/useBackgroundUpload';

const MAX_FILES = 7;

interface LoadingSheetFieldProps {
  turnaroundId?: string;
  imageUrls: string[];
  onChange: (urls: string[]) => void;
}

export const LoadingSheetField: React.FC<LoadingSheetFieldProps> = ({
  turnaroundId,
  imageUrls,
  onChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [displayUrls, setDisplayUrls] = useState<(string | null)[]>([]);

  const { pending, addFiles, removePending, retryFailed, isUploading } = useBackgroundUpload({
    bucket: 'loading-sheets',
    filePrefix: 'ls',
    maxFiles: MAX_FILES,
    turnaroundId,
    serverUrls: imageUrls,
    onUrlsChange: onChange,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all(imageUrls.map(u => getSignedUrl(u))).then(urls => {
      if (!cancelled) setDisplayUrls(urls);
    });
    return () => { cancelled = true; };
  }, [imageUrls]);

  const handleDelete = async (index: number) => {
    const url = imageUrls[index];
    if (url) {
      const parsed = parseStoragePath(url);
      if (parsed) {
        await supabase.storage.from(parsed.bucket).remove([parsed.path]);
      }
    }
    onChange(imageUrls.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) addFiles(files);
    e.target.value = '';
  };

  const totalCount = imageUrls.length + pending.filter(p => p.status !== 'error').length;
  const canAdd = totalCount < MAX_FILES;

  return (
    <Card className="card-operational">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 rounded-lg bg-muted">
            <FileImage className="h-5 w-5 text-muted-foreground" />
          </div>
          Hoja de carga
          <span className="text-xs text-muted-foreground font-normal ml-auto">
            {imageUrls.length}/{MAX_FILES}
            {isUploading && <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(imageUrls.length > 0 || pending.length > 0) && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {imageUrls.map((url, idx) => (
              <div key={url} className="relative group">
                <img
                  src={displayUrls[idx] || ''}
                  alt={`Hoja de carga ${idx + 1}`}
                  className="w-full aspect-square rounded-lg border border-border object-cover cursor-pointer"
                  onClick={() => displayUrls[idx] && window.open(displayUrls[idx]!, '_blank')}
                />
                <DeletePhotoButton onConfirm={() => handleDelete(idx)} />
              </div>
            ))}
            {/* Pending local images */}
            {pending.map((p) => (
              <div key={p.localUrl} className="relative group">
                <img
                  src={p.localUrl}
                  alt="Subiendo..."
                  className={`w-full aspect-square rounded-lg border object-cover ${
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

        {canAdd && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 bg-primary text-primary-foreground border-primary hover:bg-primary/80 hover:border-primary/80"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
              Cámara
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 bg-success text-success-foreground border-success hover:bg-success/80 hover:border-success/80"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4" />
              Galería
            </Button>
          </div>
        )}

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
      </CardContent>
    </Card>
  );
};
