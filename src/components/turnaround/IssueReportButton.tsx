import React, { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bug, Camera, CheckCircle2, Clock, Loader2, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { buildStoragePath } from '@/utils/storageUrl';
import { compressImage } from '@/utils/imageCompressor';

interface IssueReportButtonProps {
  turnaroundId?: string;
  flightNumber: string;
  airlineName: string;
  aircraftModel: string;
  date: Date;
  matricula?: string;
  tango?: string;
  isRemote?: boolean;
  remoteLocation?: string;
  departureTime?: string | null;
}

interface ExistingReport {
  id: string;
  description: string;
  status: 'pending' | 'resolved';
  created_at: string;
}

export const IssueReportButton: React.FC<IssueReportButtonProps> = ({
  turnaroundId,
  flightNumber,
  airlineName,
  aircraftModel,
  date,
  matricula,
  tango,
  isRemote,
  remoteLocation,
  departureTime,
}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [existing, setExisting] = useState<ExistingReport[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load previous reports for this escala so the user sees their status (⏳/✅)
  useEffect(() => {
    if (!open || !user || !turnaroundId) return;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('issue_reports')
        .select('id, description, status, created_at')
        .eq('user_id', user.id)
        .eq('turnaround_id', turnaroundId)
        .order('created_at', { ascending: false });
      if (data) setExisting(data as ExistingReport[]);
    })();
  }, [open, user, turnaroundId]);

  const handleAddScreenshot = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const next = [...screenshots, ...files].slice(0, 3);
    setScreenshots(next);
    setPreviews(prev => {
      prev.forEach(URL.revokeObjectURL);
      return next.map(f => URL.createObjectURL(f));
    });
    e.target.value = '';
  }, [screenshots]);

  const removeScreenshot = useCallback((idx: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const handleSubmit = async () => {
    if (!user) return;
    if (!description.trim()) {
      toast({ title: 'Describe el problema', description: 'El cuadro de texto no puede estar vacío.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      // Upload screenshots to the existing turnaround-files bucket
      const urls: string[] = [];
      for (const original of screenshots) {
        let file = original;
        try { file = await compressImage(original); } catch { /* use original */ }
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${user.id}/issue-${turnaroundId || 'general'}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error } = await supabase.storage.from('turnaround-files').upload(path, file, { upsert: true });
        if (error) throw error;
        urls.push(buildStoragePath('turnaround-files', path));
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any).from('issue_reports').insert({
        user_id: user.id,
        user_email: user.email ?? null,
        turnaround_id: turnaroundId ?? null,
        flight_number: flightNumber || null,
        airline: airlineName || null,
        aircraft_model: aircraftModel || null,
        flight_date: format(date, 'yyyy-MM-dd'),
        departure_time: departureTime ?? null,
        matricula: matricula || null,
        tango: tango || null,
        is_remote: !!isRemote,
        remote_location: remoteLocation || null,
        description: description.trim(),
        screenshot_urls: urls,
      });
      if (insertError) throw insertError;

      toast({ title: 'Reporte enviado', description: 'El administrador revisará el fallo. Verás un ✅ cuando esté resuelto.' });
      setDescription('');
      setScreenshots([]);
      setPreviews(prev => { prev.forEach(URL.revokeObjectURL); return []; });
      setOpen(false);
    } catch (err) {
      console.error('Issue report error:', err);
      toast({ title: 'Error', description: 'No se pudo enviar el reporte. Inténtalo de nuevo.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="aero-header-action shrink-0 flex items-center justify-center h-10 w-10 rounded-lg border-2 bg-muted border-border text-warning hover:bg-muted/80 transition-colors"
        title="Reportar fallo de la app en esta escala"
        aria-label="Reportar fallo de la app"
      >
        <Bug className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-warning" />
              Reportar fallo de la app
            </DialogTitle>
            <DialogDescription>
              El reporte queda ligado a esta escala para que el administrador pueda analizarlo con toda la información.
            </DialogDescription>
          </DialogHeader>

          {/* Flight context (read-only) */}
          <div className="rounded-lg bg-muted p-3 text-xs font-mono space-y-1">
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              <span><strong>Vuelo:</strong> {flightNumber || '—'}</span>
              <span><strong>Aerolínea:</strong> {airlineName || '—'}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              <span><strong>Modelo:</strong> {aircraftModel || '—'}</span>
              <span><strong>Matrícula:</strong> {matricula || '—'}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              <span><strong>Fecha:</strong> {format(date, 'dd/MM/yyyy', { locale: es })}</span>
              {departureTime && <span><strong>Salida:</strong> {departureTime}</span>}
              <span><strong>{isRemote ? 'Remoto' : 'Tango'}:</strong> {isRemote ? (remoteLocation || 'Sí') : (tango || '—')}</span>
            </div>
          </div>

          {/* Previous reports for this escala */}
          {existing.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reportes anteriores</p>
              {existing.map(r => (
                <div key={r.id} className="flex items-start gap-2 rounded-md border border-border p-2 text-xs">
                  {r.status === 'resolved'
                    ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    : <Clock className="h-4 w-4 shrink-0 text-warning" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{r.description}</p>
                    <p className="text-muted-foreground">
                      {format(new Date(r.created_at), 'dd/MM HH:mm')} · {r.status === 'resolved' ? '✅ Resuelto' : 'Pendiente'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">¿Qué ha fallado?</p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el problema: qué intentabas hacer, qué esperabas y qué ocurrió…"
              rows={4}
              className="text-sm"
            />
          </div>

          {/* Screenshots */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Capturas de pantalla (opcional, máx. 3)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleAddScreenshot}
            />
            <div className="flex flex-wrap gap-2">
              {previews.map((url, idx) => (
                <div key={url} className="relative h-20 w-20 overflow-hidden rounded-md border border-border">
                  <img src={url} alt={`Captura ${idx + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeScreenshot(idx)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                    aria-label="Quitar captura"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {screenshots.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  <Camera className="h-5 w-5" />
                  <span className="text-[10px]">Añadir</span>
                </button>
              )}
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={sending} className="w-full gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar reporte
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IssueReportButton;
