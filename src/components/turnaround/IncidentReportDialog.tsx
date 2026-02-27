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
import { AlertTriangle, FileDown, Save } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

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

const generateIncidentPdf = (data: {
  nombre: string;
  vueloFecha: string;
  parking: string;
  descripcion: string;
  fecha: string;
}) => {
  const logoUrl = `${window.location.origin}/images/aviapartner-logo.jpeg`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe Incidente — ${data.vueloFecha}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; padding: 40px; }
  .page { border: 2px solid #000; padding: 0; position: relative; min-height: 90vh; }
  .header-table { width: 100%; border-collapse: collapse; }
  .header-table td { border: 1px solid #000; padding: 6px 10px; vertical-align: middle; }
  .logo-cell { width: 35%; text-align: center; }
  .logo-cell img { max-height: 60px; }
  .mad-cell { width: 20%; text-align: center; }
  .mad-title { font-size: 22px; font-weight: bold; }
  .mad-subtitle { font-size: 11px; font-weight: bold; margin-top: 4px; }
  .info-cell { width: 45%; }
  .info-label { font-weight: bold; font-size: 11px; }

  .fields-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  .fields-table td { border: 1px solid #000; padding: 8px 10px; }
  .fields-table .field-label { font-weight: bold; width: 33%; }

  .desc-container { border: 1px solid #000; margin-top: 0; min-height: 500px; padding: 10px; }
  .desc-label { font-weight: bold; margin-bottom: 8px; }
  .desc-text { white-space: pre-wrap; font-size: 12px; line-height: 1.6; }

  .footer { position: absolute; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-between; padding: 10px 16px; font-size: 9px; color: #333; border-top: 1px solid #ccc; }

  .sidebar { position: absolute; left: -2px; top: 50%; transform: translateY(-50%) rotate(-90deg); transform-origin: center; font-size: 10px; font-weight: bold; letter-spacing: 1px; color: #555; white-space: nowrap; }

  @media print {
    body { padding: 0; }
    @page { margin: 12mm; }
  }
</style>
</head>
<body>
  <div class="page">
    <table class="header-table">
      <tr>
        <td class="logo-cell" rowspan="2">
          <img src="${logoUrl}" alt="Aviapartner" />
        </td>
        <td class="mad-cell" rowspan="2">
          <div class="mad-title">MAD</div>
          <div class="mad-subtitle">INFORME<br>INCIDENTE</div>
        </td>
        <td class="info-cell"><span class="info-label">DEPARTAMENTO:</span> Rampa</td>
      </tr>
      <tr>
        <td class="info-cell">
          <div><span class="info-label">FECHA:</span> ${data.fecha}</div>
          <div style="margin-top:4px;"><span class="info-label">Rev:</span></div>
          <div style="margin-top:4px;"><span class="info-label">Página:</span> 1</div>
        </td>
      </tr>
    </table>

    <table class="fields-table">
      <tr>
        <td class="field-label">NOMBRE: <span style="font-weight:normal;">${data.nombre}</span></td>
        <td class="field-label">VUELO/FECHA: <span style="font-weight:normal;">${data.vueloFecha}</span></td>
        <td class="field-label">PARKING: <span style="font-weight:normal;">${data.parking}</span></td>
      </tr>
    </table>

    <div class="desc-container">
      <div class="desc-label">DESCRIPCIÓN:</div>
      <div class="desc-text">${data.descripcion}</div>
    </div>

    <div class="sidebar">AVIAPARTNER (MAD)</div>

    <div class="footer">
      <div>Management System Aviapartner<br>SPAIN-<br>APO A002.ed 170619.1.0</div>
      <div>Uncontrolled Copy when not On Intranet</div>
      <div style="text-align:right;">Validity date: 19/06/2017<br>Print date: ${format(new Date(), 'dd/MM/yyyy')}<br>Pag 1 of 1</div>
    </div>
  </div>
</body>
</html>`;

  const isStandalone = (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;

  if (isStandalone) {
    const existingOverlay = document.getElementById('pdf-overlay');
    if (existingOverlay) document.body.removeChild(existingOverlay);

    const overlay = document.createElement('div');
    overlay.id = 'pdf-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:white;display:flex;flex-direction:column;';

    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:#1a1a2e;color:#fff;font-family:sans-serif;font-size:15px;';

    const title = document.createElement('span');
    title.textContent = 'Informe Incidente';
    toolbar.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Cerrar';
    closeBtn.style.cssText = 'background:#ef4444;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:14px;font-weight:600;cursor:pointer;';
    closeBtn.onclick = () => document.body.removeChild(overlay);
    toolbar.appendChild(closeBtn);

    overlay.appendChild(toolbar);

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'flex:1;border:none;width:100%;';
    iframe.srcdoc = html;
    overlay.appendChild(iframe);

    document.body.appendChild(overlay);
  } else {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');

    if (!newWindow) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `informe-incidente-${data.vueloFecha.replace(/\//g, '-')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    setTimeout(() => URL.revokeObjectURL(url), 15000);
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

  const handleExport = () => {
    generateIncidentPdf({
      nombre,
      vueloFecha,
      parking,
      descripcion,
      fecha: fechaFormateada,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
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
              disabled={!nombre.trim() || !descripcion.trim()}
            >
              <FileDown className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
