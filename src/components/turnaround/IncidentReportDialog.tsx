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
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
}

const esc = (s: string) => {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
};

const generateIncidentPdf = async (data: {
  nombre: string;
  vueloFecha: string;
  parking: string;
  descripcion: string;
  fecha: string;
}) => {
  const logoUrl = `${window.location.origin}/images/aviapartner-logo.jpeg`;

  // Create a hidden container to render HTML for capture
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;background:white;z-index:-1;';
  container.innerHTML = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#000;padding:38px;width:794px;height:1123px;box-sizing:border-box;">
      <div style="border:2px solid #000;width:100%;height:100%;display:flex;flex-direction:column;position:relative;">
        <table style="width:100%;border-collapse:collapse;flex-shrink:0;">
          <tr>
            <td style="width:35%;text-align:center;border:1px solid #000;padding:6px 10px;vertical-align:middle;" rowspan="2">
              <img src="${logoUrl}" alt="Aviapartner" style="max-height:60px;" />
            </td>
            <td style="width:20%;text-align:center;border:1px solid #000;padding:6px 10px;vertical-align:middle;" rowspan="2">
              <div style="font-size:22px;font-weight:bold;">MAD</div>
              <div style="font-size:11px;font-weight:bold;margin-top:4px;">INFORME<br>INCIDENTE</div>
            </td>
            <td style="width:45%;border:1px solid #000;padding:6px 10px;vertical-align:middle;">
              <span style="font-weight:bold;font-size:11px;">DEPARTAMENTO:</span> Rampa
            </td>
          </tr>
          <tr>
            <td style="width:45%;border:1px solid #000;padding:6px 10px;vertical-align:middle;">
              <div><span style="font-weight:bold;font-size:11px;">FECHA:</span> ${data.fecha}</div>
              <div style="margin-top:4px;"><span style="font-weight:bold;font-size:11px;">Rev:</span></div>
              <div style="margin-top:4px;"><span style="font-weight:bold;font-size:11px;">Página:</span> 1</div>
            </td>
          </tr>
        </table>
        <table style="width:100%;border-collapse:collapse;flex-shrink:0;">
          <tr>
            <td style="border:1px solid #000;padding:8px 10px;font-weight:bold;width:33%;">NOMBRE: <span style="font-weight:normal;">${data.nombre}</span></td>
            <td style="border:1px solid #000;padding:8px 10px;font-weight:bold;width:33%;">VUELO/FECHA: <span style="font-weight:normal;">${data.vueloFecha}</span></td>
            <td style="border:1px solid #000;padding:8px 10px;font-weight:bold;width:34%;">PARKING: <span style="font-weight:normal;">${data.parking}</span></td>
          </tr>
        </table>
        <div style="border:1px solid #000;border-top:none;flex:1;padding:10px;display:flex;flex-direction:column;">
          <div style="font-weight:bold;margin-bottom:8px;">DESCRIPCIÓN:</div>
          <div style="white-space:pre-wrap;font-size:12px;line-height:1.6;flex:1;">${data.descripcion}</div>
        </div>
        <div style="position:absolute;left:-2px;top:50%;transform:translateY(-50%) rotate(-90deg);transform-origin:center;font-size:10px;font-weight:bold;letter-spacing:1px;color:#555;white-space:nowrap;">AVIAPARTNER (MAD)</div>
        <div style="flex-shrink:0;display:flex;justify-content:space-between;padding:10px 16px;font-size:9px;color:#333;border-top:1px solid #ccc;">
          <div>Management System Aviapartner<br>SPAIN-<br>APO A002.ed 170619.1.0</div>
          <div>Uncontrolled Copy when not On Intranet</div>
          <div style="text-align:right;">Validity date: 19/06/2017<br>Print date: ${format(new Date(), 'dd/MM/yyyy')}<br>Pag 1 of 1</div>
        </div>
      </div>
    </div>`;

  document.body.appendChild(container);

  // Wait for logo to load
  const img = container.querySelector('img');
  if (img && !img.complete) {
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      setTimeout(resolve, 2000);
    });
  }

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: 794,
      height: 1123,
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
};

export const IncidentReportDialog: React.FC<IncidentReportDialogProps> = ({
  flightNumber,
  date,
  parking,
  reportData,
  onSave,
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

  const handleSave = () => {
    onSave({ nombre, descripcion });
    toast.success('Informe guardado correctamente');
    setOpen(false);
  };

  const getPdfBlob = async () => {
    return generateIncidentPdf({
      nombre,
      vueloFecha,
      parking,
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
              disabled={!nombre.trim() || !descripcion.trim()}
            >
              <Save className="h-4 w-4" />
              Guardar
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
