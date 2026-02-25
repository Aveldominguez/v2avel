import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Camera, ImageIcon, Trash2, Loader2, File } from 'lucide-react';
import { buildStoragePath, parseStoragePath, getSignedUrl } from '@/utils/storageUrl';

interface FileUploadFieldProps {
  turnaroundId?: string;
  imageUrl: string | null;
  onChange: (url: string | null) => void;
}

export const FileUploadField: React.FC<FileUploadFieldProps> = ({
  turnaroundId,
  imageUrl,
  onChange,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (imageUrl) {
      getSignedUrl(imageUrl).then(url => { if (!cancelled) setDisplayUrl(url); });
    } else {
      setDisplayUrl(null);
    }
    return () => { cancelled = true; };
  }, [imageUrl]);

  const uploadFile = async (file: globalThis.File) => {
    if (!user) {
      toast({ title: 'Error', description: 'Debes iniciar sesión', variant: 'destructive' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Error', description: 'El archivo no puede superar 10MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${turnaroundId || 'new'}-${Date.now()}.${ext}`;

      if (imageUrl) {
        const oldPath = extractPathFromUrl(imageUrl);
        if (oldPath) {
          await supabase.storage.from('turnaround-files').remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('turnaround-files')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      onChange(buildStoragePath('turnaround-files', fileName));
      toast({ title: 'Archivo subido correctamente' });
    } catch (err) {
      console.error('Upload error:', err);
      toast({ title: 'Error', description: 'No se pudo subir el archivo', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const extractPathFromUrl = (url: string): string | null => {
    const parsed = parseStoragePath(url);
    if (parsed && parsed.bucket === 'turnaround-files') return parsed.path;
    try {
      const match = url.match(/turnaround-files\/(.+)$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  const handleDelete = async () => {
    if (imageUrl) {
      const path = extractPathFromUrl(imageUrl);
      if (path) {
        await supabase.storage.from('turnaround-files').remove([path]);
      }
    }
    onChange(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  return (
    <Card className="card-operational">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 rounded-lg bg-muted">
            <File className="h-5 w-5 text-muted-foreground" />
          </div>
          File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {imageUrl ? (
          <div className="relative">
            <img
              src={displayUrl || ''}
              alt="File"
              className="w-full rounded-lg border border-border object-contain max-h-[400px]"
              onClick={() => displayUrl && window.open(displayUrl, '_blank')}
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Cámara
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              Galería
            </Button>
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
      </CardContent>
    </Card>
  );
};
