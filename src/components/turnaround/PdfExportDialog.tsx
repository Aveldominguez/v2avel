import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { PdfImageOptions } from '@/utils/generateTurnaroundPdf';

interface PdfExportDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Cuántas imágenes hay en cada apartado, para no ofrecer lo que no existe. */
  counts: { loadingSheets: number; files: number; observationPhotos: number };
  onExport: (images: PdfImageOptions) => Promise<void>;
}

const APARTADOS = [
  { key: 'loadingSheets', label: 'Hoja de carga' },
  { key: 'files', label: 'Adjuntar File' },
  { key: 'observationPhotos', label: 'Fotos de observaciones' },
] as const;

/**
 * Elegir qué imágenes van al PDF antes de generarlo.
 *
 * Nacen todas desmarcadas a propósito: un informe se iba a tres hojas o más y
 * las fotos eran la mayor parte. Así nunca se imprime de más por descuido, sólo
 * de menos, que se arregla volviendo a exportar.
 */
export const PdfExportDialog: React.FC<PdfExportDialogProps> = ({
  open, onOpenChange, counts, onExport,
}) => {
  const [sel, setSel] = useState<PdfImageOptions>({});
  const [generando, setGenerando] = useState(false);

  const disponibles = APARTADOS.filter(a => counts[a.key] > 0);
  const total = disponibles.reduce((n, a) => n + (sel[a.key] ? counts[a.key] : 0), 0);

  const exportar = async () => {
    setGenerando(true);
    try {
      await onExport(sel);
      onOpenChange(false);
    } finally {
      setGenerando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!generando) { setSel({}); onOpenChange(v); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Exportar PDF</DialogTitle>
          <DialogDescription className="text-left">
            {disponibles.length > 0
              ? 'Marca las imágenes que quieras incluir. Sin marcar nada sale sólo el informe de horas, que es lo que ocupa menos.'
              : 'Esta escala no tiene imágenes adjuntas. Se exportará el informe de horas.'}
          </DialogDescription>
        </DialogHeader>

        {disponibles.length > 0 && (
          <div className="space-y-1">
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

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full gap-2" onClick={exportar} disabled={generando}>
            {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {generando ? 'Generando…' : 'Exportar'}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)} disabled={generando}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
