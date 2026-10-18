import React, { useCallback, useEffect, useState } from 'react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle, FileDown, Loader2, Plus, Save, Share2, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMyProfile } from '@/hooks/useMyProfile';
import { generateIncidentPdf } from '@/utils/generateIncidentPdf';
import { cn } from '@/lib/utils';

interface StandaloneReportDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface InformeGuardado {
  id: string;
  author_name: string;
  report_date: string;
  location: string | null;
  description: string;
  created_at: string;
}

/** Fecha del campo (YYYY-MM-DD) a la que sale impresa (DD/MM/YYYY). */
export const fechaImpresa = (iso: string): string => {
  const d = parse(iso, 'yyyy-MM-dd', new Date());
  return isNaN(d.getTime()) ? iso : format(d, 'dd/MM/yyyy', { locale: es });
};

/** Nombre del fichero: sin espacios ni barras, que rompen la descarga. */
export const nombreArchivoInforme = (fechaIso: string, ubicacion: string): string => {
  const trozo = ubicacion.trim().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
  return `informe-${trozo || 'general'}-${fechaIso}.pdf`;
};

/**
 * Informe de incidente que no va ligado a ninguna escala.
 *
 * Es el mismo impreso de siempre, con las tres casillas adaptadas: donde la
 * escala pone el vuelo y el parking, aquí van la fecha de los hechos y el
 * sitio donde ocurrieron. Se guarda, para poder volver a abrirlo y
 * reexportarlo: un informe que se entrega conviene tenerlo.
 */
export const StandaloneReportDialog: React.FC<StandaloneReportDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { displayName } = useMyProfile();

  const hoy = format(new Date(), 'yyyy-MM-dd');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState(hoy);
  const [ubicacion, setUbicacion] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const [previos, setPrevios] = useState<InformeGuardado[]>([]);

  const limpiar = useCallback(() => {
    setEditandoId(null);
    setNombre(displayName);
    setFecha(format(new Date(), 'yyyy-MM-dd'));
    setUbicacion('');
    setDescripcion('');
  }, [displayName]);

  const cargarPrevios = useCallback(async () => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('standalone_reports')
      .select('id, author_name, report_date, location, description, created_at')
      .eq('user_id', user.id)
      .order('report_date', { ascending: false })
      .limit(10);
    if (data) setPrevios(data as InformeGuardado[]);
  }, [user]);

  useEffect(() => {
    if (!open) return;
    limpiar();
    void cargarPrevios();
  }, [open, limpiar, cargarPrevios]);

  const datosPdf = () => ({
    casillas: [
      { etiqueta: 'NOMBRE', valor: nombre },
      { etiqueta: 'FECHA', valor: fechaImpresa(fecha) },
      { etiqueta: 'UBICACIÓN', valor: ubicacion },
    ] as [ { etiqueta: string; valor: string }, { etiqueta: string; valor: string }, { etiqueta: string; valor: string } ],
    descripcion,
    fecha: fechaImpresa(fecha),
  });

  const faltaAlgo = !nombre.trim() || !descripcion.trim();

  const guardar = async () => {
    if (!user || faltaAlgo) return;
    setGuardando(true);
    try {
      const fila = {
        user_id: user.id,
        author_name: nombre.trim(),
        report_date: fecha,
        location: ubicacion.trim() || null,
        description: descripcion.trim(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q = (supabase as any).from('standalone_reports');
      const { error } = editandoId
        ? await q.update({ ...fila, updated_at: new Date().toISOString() }).eq('id', editandoId)
        : await q.insert(fila);
      if (error) throw error;
      toast({ title: editandoId ? 'Informe actualizado' : 'Informe guardado' });
      await cargarPrevios();
      limpiar();
    } catch (e) {
      toast({
        title: 'No se pudo guardar',
        description: e instanceof Error ? e.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setGuardando(false);
    }
  };

  const exportar = async () => {
    setExportando(true);
    try {
      const blob = await generateIncidentPdf(datosPdf());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivoInforme(fecha, ubicacion);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'PDF descargado' });
    } catch {
      toast({ title: 'Error al generar el PDF', variant: 'destructive' });
    } finally {
      setExportando(false);
    }
  };

  const compartir = async () => {
    setCompartiendo(true);
    try {
      const blob = await generateIncidentPdf(datosPdf());
      const file = new File([blob], nombreArchivoInforme(fecha, ubicacion), { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Informe de incidente', files: [file] });
      } else {
        await exportar();
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') {
        toast({ title: 'Error al compartir', variant: 'destructive' });
      }
    } finally {
      setCompartiendo(false);
    }
  };

  const abrirPrevio = (r: InformeGuardado) => {
    setEditandoId(r.id);
    setNombre(r.author_name);
    setFecha(r.report_date);
    setUbicacion(r.location ?? '');
    setDescripcion(r.description);
  };

  const borrarPrevio = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('standalone_reports').delete().eq('id', id);
    if (error) {
      toast({ title: 'No se pudo borrar', variant: 'destructive' });
      return;
    }
    if (editandoId === id) limpiar();
    await cargarPrevios();
    toast({ title: 'Informe borrado' });
  };

  const ocupado = guardando || exportando || compartiendo;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!ocupado) onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {editandoId ? 'Editar informe' : 'Nuevo informe'}
          </DialogTitle>
          <DialogDescription className="text-left">
            Informe de incidente sin escala: se imprime en la hoja de la empresa, con tu nombre,
            la fecha de los hechos y dónde ocurrieron.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inf-nombre">Nombre</Label>
            <Input id="inf-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="inf-fecha">Fecha de los hechos</Label>
              <Input id="inf-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inf-ubicacion">Ubicación</Label>
              <Input
                id="inf-ubicacion"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value.toUpperCase())}
                placeholder="T16, sala 6, almacén…"
                maxLength={40}
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inf-desc">Descripción</Label>
            <Textarea
              id="inf-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Qué pasó, cuándo, quién estaba y qué se hizo."
              rows={7}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Button className="w-full gap-2" onClick={guardar} disabled={ocupado || faltaAlgo}>
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editandoId ? 'Guardar cambios' : 'Guardar informe'}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={exportar} disabled={ocupado || faltaAlgo}>
                {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                PDF
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={compartir} disabled={ocupado || faltaAlgo}>
                {compartiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                Compartir
              </Button>
            </div>
            {editandoId && (
              <Button variant="ghost" className="w-full gap-2" onClick={limpiar} disabled={ocupado}>
                <Plus className="h-4 w-4" />
                Empezar uno nuevo
              </Button>
            )}
          </div>

          {previos.length > 0 && (
            <div className="space-y-1.5 border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Informes guardados
              </p>
              {previos.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    'flex items-start gap-2 rounded-md border p-2 text-xs',
                    editandoId === r.id ? 'border-primary bg-primary/10' : 'border-border',
                  )}
                >
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => abrirPrevio(r)}>
                    <p className="truncate font-medium">{r.description}</p>
                    <p className="text-muted-foreground">
                      {fechaImpresa(r.report_date)}{r.location ? ` · ${r.location}` : ''}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => borrarPrevio(r.id)}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                    aria-label="Borrar informe"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
