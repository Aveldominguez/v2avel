import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, FileDown, Save, Loader2, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { generateIncidentPdf } from '@/utils/generateIncidentPdf';

export interface IncidentReportData {
  nombre: string;
  descripcion: string;
}

interface IncidentReportDialogProps {
  flightNumber: string;
  date: Date;
  parking: string;
  reportData?: IncidentReportData | null;
  onSave: (data: IncidentReportData) => void;
  /**
   * Lo deja guardado en el servidor. Sin esto el informe sólo vive en la
   * pantalla y en el borrador del móvil, que caduca a las 48 horas.
   * Viene sin definir en una escala que todavía no existe.
   */
  onPersist?: (data: IncidentReportData) => Promise<void>;
}

export const IncidentReportDialog: React.FC<IncidentReportDialogProps> = ({
  flightNumber,
  date,
  parking,
  reportData,
  onSave,
  onPersist,
}) => {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  // Load existing data when dialog opens
  useEffect(() => {
    if (open && reportData) {
      setNombre(reportData.nombre);
      setDescripcion(reportData.descripcion);
    } else if (open && !reportData) {
      setNombre('');
      setDescripcion('');
    }
  }, [open, reportData]);

  const vueloFecha = `${flightNumber} / ${format(date, 'dd/MM/yyyy', { locale: es })}`;
  const fechaFormateada = format(date, 'dd/MM/yyyy', { locale: es });

  const hasReport = Boolean(reportData?.nombre || reportData?.descripcion);

  const [guardando, setGuardando] = useState(false);

  const handleSave = async () => {
    const data = { nombre, descripcion };
    onSave(data);
    if (!onPersist) {
      // No se miente: en una escala sin crear esto no ha salido del móvil.
      toast.success('Informe añadido. Se guardará al guardar la escala.');
      setOpen(false);
      return;
    }
    setGuardando(true);
    try {
      await onPersist(data);
      toast.success('Informe guardado en la escala');
      setOpen(false);
    } catch {
      toast.error('No se pudo guardar el informe. Dale a Guardar en la escala.');
    } finally {
      setGuardando(false);
    }
  };

  const getPdfBlob = async () => {
    return generateIncidentPdf({
      casillas: [
        { etiqueta: 'NOMBRE', valor: nombre },
        { etiqueta: 'VUELO/FECHA', valor: vueloFecha },
        { etiqueta: 'PARKING', valor: parking },
      ],
      descripcion,
      fecha: fechaFormateada,
    });
  };

  const fileName = `informe-${vueloFecha.replace(/[\s/]/g, '-')}.pdf`;

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await getPdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF descargado');
    } catch (e) {
      toast.error('Error al generar el PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await getPdfBlob();
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Informe — ${vueloFecha}`,
          files: [file],
        });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.info('Compartir no disponible, se ha descargado el PDF');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        toast.error('Error al compartir');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 uppercase bg-destructive text-destructive-foreground border-destructive hover:bg-black hover:text-white hover:border-black active:bg-black active:text-white">
          <AlertTriangle className={`h-4 w-4 ${hasReport ? 'text-warning' : ''}`} />
          Informe
          {hasReport && (
            <span className="ml-1 h-2 w-2 rounded-full bg-warning inline-block" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Informe de Incidente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="incident-nombre">Nombre</Label>
            <Input
              id="incident-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del informante"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vuelo / Fecha</Label>
              <Input value={vueloFecha} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Parking</Label>
              <Input value={parking} readOnly className="bg-muted" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="incident-descripcion">Descripción</Label>
            <Textarea
              id="incident-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describa el incidente con detalle..."
              className="min-h-[200px] resize-y"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              variant="secondary"
              className="flex-1 gap-2 font-semibold"
              disabled={!nombre.trim() || !descripcion.trim() || guardando}
            >
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button
              onClick={handleExport}
              className="flex-1 gap-2 font-semibold"
              disabled={!nombre.trim() || !descripcion.trim() || exporting}
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {exporting ? 'Generando...' : 'PDF'}
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="flex-1 gap-2 font-semibold"
              disabled={!nombre.trim() || !descripcion.trim() || sharing}
            >
              {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              {sharing ? 'Enviando...' : 'Compartir'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
