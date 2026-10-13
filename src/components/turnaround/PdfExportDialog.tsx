import { useState } from 'react';
import { ClipboardList, FileDown, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { PdfImageOptions } from '@/utils/generateTurnaroundPdf';

/** Qué documento se va a sacar. */
export type PdfFormato = 'informe' | 'controlRampa';

export interface PdfExportChoice {
  formato: PdfFormato;
  /** Sólo para el informe: qué apartados de imágenes se incluyen. */
  images: PdfImageOptions;
  /** Sólo para el Control de Rampa: adjuntar el detalle de la LIR escaneada. */
  lirAirCanada?: boolean;
}

interface PdfExportDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Cuántas imágenes hay en cada apartado, para no ofrecer lo que no existe. */
  counts: { loadingSheets: number; files: number; observationPhotos: number };
  /** Si la escala es de Air Canada, que es la que tiene LIR escaneada. */
  tieneLirEscaneada?: boolean;
  onExport: (eleccion: PdfExportChoice) => Promise<void>;
}

const APARTADOS = [
  { key: 'loadingSheets', label: 'Hoja de carga' },
  { key: 'files', label: 'Adjuntar File' },
  { key: 'observationPhotos', label: 'Fotos de observaciones' },
] as const;

/**
 * Elegir qué se exporta antes de generarlo.
 *
 * Dos documentos distintos: el informe de escala de siempre, con todo el
 * detalle y las fotos que se marquen, y la hoja de Control de Rampa, que es el
 * parte de papel de Aviapartner en una sola A4 para entregar o firmar.
 *
 * Las imágenes nacen todas desmarcadas a propósito: un informe se iba a tres
 * hojas o más y las fotos eran la mayor parte. Así nunca se imprime de más por
 * descuido, sólo de menos, que se arregla volviendo a exportar.
 */
export const PdfExportDialog: React.FC<PdfExportDialogProps> = ({
  open, onOpenChange, counts, tieneLirEscaneada, onExport,
}) => {
  const [formato, setFormato] = useState<PdfFormato>('informe');
  const [sel, setSel] = useState<PdfImageOptions>({});
  const [lir, setLir] = useState(false);
  const [generando, setGenerando] = useState(false);

  const disponibles = APARTADOS.filter(a => counts[a.key] > 0);
  const total = disponibles.reduce((n, a) => n + (sel[a.key] ? counts[a.key] : 0), 0);

  const cerrar = (v: boolean) => {
    if (generando) return;
    if (!v) { setSel({}); setLir(false); setFormato('informe'); }
    onOpenChange(v);
  };

  const exportar = async () => {
    setGenerando(true);
    try {
      await onExport(
        formato === 'informe'
          ? { formato, images: sel }
          : { formato, images: {}, lirAirCanada: lir },
      );
      cerrar(false);
    } finally {
      setGenerando(false);
    }
  };

  const opcionFormato = (
    valor: PdfFormato,
    Icono: typeof FileText,
    titulo: string,
    detalle: string,
  ) => (
    <button
      type="button"
      onClick={() => setFormato(valor)}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border-2 p-3 text-left transition-colors active:scale-[0.99]',
        formato === valor ? 'border-primary bg-primary/10' : 'border-border',
      )}
    >
      <Icono className={cn('mt-0.5 h-5 w-5 shrink-0', formato === valor ? 'text-primary' : 'text-muted-foreground')} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{titulo}</span>
        <span className="block text-xs text-muted-foreground">{detalle}</span>
      </span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exportar PDF</DialogTitle>
          <DialogDescription className="text-left">¿Qué quieres exportar?</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {opcionFormato('informe', FileText, 'Informe de escala',
            'El vuelo completo, con todas las horas y los compartimentos.')}
          {opcionFormato('controlRampa', ClipboardList, 'Control de Rampa',
            'El parte de papel de siempre, en una sola hoja A4.')}
        </div>

        {formato === 'informe' && disponibles.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Imágenes</p>
            {disponibles.map(a => (
              <label
                key={a.key}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 active:scale-[0.99]"
              >
                <Checkbox
                  checked={!!sel[a.key]}
                  onCheckedChange={(v) => setSel(s => ({ ...s, [a.key]: v === true }))}
                />
                <span className="flex-1 font-medium">{a.label}</span>
                <span className="text-xs text-muted-foreground">
                  {counts[a.key]} {counts[a.key] === 1 ? 'imagen' : 'imágenes'}
                </span>
              </label>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              {total === 0
                ? 'No se añadirá ninguna imagen.'
                : `Se añadirán ${total} ${total === 1 ? 'imagen' : 'imágenes'}, a dos por hoja.`}
            </p>
          </div>
        )}

        {formato === 'controlRampa' && tieneLirEscaneada && (
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 active:scale-[0.99]">
            <Checkbox checked={lir} onCheckedChange={(v) => setLir(v === true)} />
            <span className="flex-1">
              <span className="block font-medium">LIR escaneada</span>
              <span className="block text-xs text-muted-foreground">
                El detalle de llegada y salida, en hojas aparte.
              </span>
            </span>
          </label>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full gap-2" onClick={exportar} disabled={generando}>
            {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {generando ? 'Generando…' : 'Exportar'}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => cerrar(false)} disabled={generando}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
