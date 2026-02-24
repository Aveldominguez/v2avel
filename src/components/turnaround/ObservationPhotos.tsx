import React, { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Camera, ImageIcon, Trash2, Loader2 } from 'lucide-react';

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

  const uploadFile = async (file: globalThis.File) => {
    if (!user) {
      toast({ title: 'Error', description: 'Debes iniciar sesión', variant: 'destructive' });
      return;
    }
    if (photos.length >= MAX_PHOTOS) {
      toast({ title: 'Límite alcanzado', description: `Máximo ${MAX_PHOTOS} fotografías`, variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Error', description: 'El archivo no puede superar 10MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${turnaroundId || 'new'}-obs-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('turnaround-files')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('turnaround-files')
        .getPublicUrl(fileName);

      onChange([...photos, publicUrl]);
      toast({ title: 'Foto subida correctamente' });
    } catch (err) {
      console.error('Upload error:', err);
      toast({ title: 'Error', description: 'No se pudo subir la foto', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (index: number) => {
    const url = photos[index];
    try {
      const match = url.match(/turnaround-files\/(.+)$/);
      if (match) {
        await supabase.storage.from('turnaround-files').remove([match[1]]);
      }
    } catch {}
    onChange(photos.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
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
                src={url}
                alt={`Observación ${i + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-border cursor-pointer"
                onClick={() => window.open(url, '_blank')}
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
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};
