import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Camera, ImageIcon, Trash2, Loader2, Paperclip } from 'lucide-react';
import { buildStoragePath, parseStoragePath, getSignedUrl } from '@/utils/storageUrl';

const MAX_FILES = 7;

interface FileUploadFieldProps {
  turnaroundId?: string;
  fileUrls: string[];
  onChange: (urls: string[]) => void;
}

export const FileUploadField: React.FC<FileUploadFieldProps> = ({
  turnaroundId,
  fileUrls,
  onChange,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [displayUrls, setDisplayUrls] = useState<(string | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(fileUrls.map(u => getSignedUrl(u))).then(urls => {
      if (!cancelled) setDisplayUrls(urls);
    });
    return () => { cancelled = true; };
  }, [fileUrls]);

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

  const uploadFiles = async (files: globalThis.File[]) => {
    if (!user) {
      toast({ title: 'Error', description: 'Debes iniciar sesión', variant: 'destructive' });
      return;
    }
    const remaining = MAX_FILES - fileUrls.length;
    if (remaining <= 0) {
      toast({ title: 'Límite alcanzado', description: `Máximo ${MAX_FILES} archivos`, variant: 'destructive' });
      return;
    }
    const batch = files.slice(0, remaining);
    if (batch.length < files.length) {
      toast({ title: 'Aviso', description: `Solo se subirán ${batch.length} de ${files.length} archivos (límite ${MAX_FILES})` });
    }

    setUploading(true);
    const newPaths: string[] = [];
    try {
      for (const file of batch) {
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: 'Error', description: `${file.name} supera 10MB, omitido`, variant: 'destructive' });
          continue;
        }
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/${turnaroundId || 'new'}-file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('turnaround-files')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;
        newPaths.push(buildStoragePath('turnaround-files', fileName));
      }
      if (newPaths.length > 0) {
        onChange([...fileUrls, ...newPaths]);
        toast({ title: `${newPaths.length} archivo(s) subido(s)` });
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast({ title: 'Error', description: 'No se pudo subir el archivo', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (index: number) => {
    const url = fileUrls[index];
    if (url) {
      const path = extractPathFromUrl(url);
      if (path) {
        await supabase.storage.from('turnaround-files').remove([path]);
      }
    }
    onChange(fileUrls.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) uploadFiles(files);
    e.target.value = '';
  };

  const canAdd = fileUrls.length < MAX_FILES;

  return (
    <Card className="card-operational">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 rounded-lg bg-muted">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </div>
          Adjuntar File
          <span className="text-xs text-muted-foreground font-normal ml-auto">
            {fileUrls.length}/{MAX_FILES}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Thumbnails grid */}
        {fileUrls.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {fileUrls.map((url, idx) => (
              <div key={url} className="relative group">
                <img
                  src={displayUrls[idx] || ''}
                  alt={`File ${idx + 1}`}
                  className="w-full aspect-square rounded-lg border border-border object-cover cursor-pointer"
                  onClick={() => displayUrls[idx] && window.open(displayUrls[idx]!, '_blank')}
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-80 group-hover:opacity-100"
                  onClick={() => handleDelete(idx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Upload buttons */}
        {canAdd && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 bg-primary text-primary-foreground border-primary hover:bg-primary/80 hover:border-primary/80"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Cámara
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 bg-success text-success-foreground border-success hover:bg-success/80 hover:border-success/80"
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
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </CardContent>
    </Card>
  );
};
