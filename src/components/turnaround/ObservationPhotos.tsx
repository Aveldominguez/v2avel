import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Camera, ImageIcon, Trash2, Loader2 } from 'lucide-react';
import { buildStoragePath, parseStoragePath, getSignedUrl } from '@/utils/storageUrl';

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
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [displayUrls, setDisplayUrls] = useState<(string | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(photos.map(p => getSignedUrl(p))).then(urls => {
      if (!cancelled) setDisplayUrls(urls);
    });
    return () => { cancelled = true; };
  }, [photos]);

  const uploadFiles = async (files: globalThis.File[]) => {
    if (!user) {
      toast({ title: 'Error', description: 'Debes iniciar sesión', variant: 'destructive' });
      return;
    }
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast({ title: 'Límite alcanzado', description: `Máximo ${MAX_PHOTOS} fotografías`, variant: 'destructive' });
      return;
    }
    const batch = files.slice(0, remaining);
    if (batch.length < files.length) {
      toast({ title: 'Aviso', description: `Solo se subirán ${batch.length} de ${files.length} fotos (límite ${MAX_PHOTOS})` });
    }

    setUploading(true);
    const newPaths: string[] = [];
    try {
      for (const file of batch) {
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: 'Error', description: `${file.name} supera 10MB, omitida`, variant: 'destructive' });
          continue;
        }
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/${turnaroundId || 'new'}-obs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('turnaround-files')
          .upload(fileName, file, { upsert: true });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({ title: 'Error', description: `No se pudo subir ${file.name}`, variant: 'destructive' });
          continue;
        }
        newPaths.push(buildStoragePath('turnaround-files', fileName));
      }
      if (newPaths.length > 0) {
        onChange([...photos, ...newPaths]);
        toast({ title: `${newPaths.length} foto(s) subida(s) correctamente` });
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast({ title: 'Error', description: 'No se pudieron subir las fotos', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (index: number) => {
    const url = photos[index];
    try {
      const parsed = parseStoragePath(url);
      if (parsed) {
        await supabase.storage.from(parsed.bucket).remove([parsed.path]);
      } else {
        const match = url.match(/turnaround-files\/(.+)$/);
        if (match) {
          await supabase.storage.from('turnaround-files').remove([match[1]]);
        }
      }
    } catch {}
    onChange(photos.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) uploadFiles(Array.from(files));
    e.target.value = '';
  };

  const canAddMore = photos.length < MAX_PHOTOS;

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Fotografías ({photos.length}/{MAX_PHOTOS})
        </span>
        {canAddMore && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              Cámara
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
              Galería
            </Button>
          </div>
        )}
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative group">
              <img
                src={displayUrls[i] || ''}
                alt={`Observación ${i + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-border cursor-pointer"
                onClick={() => displayUrls[i] && window.open(displayUrls[i]!, '_blank')}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-80 group-hover:opacity-100"
                onClick={() => handleDelete(i)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};
