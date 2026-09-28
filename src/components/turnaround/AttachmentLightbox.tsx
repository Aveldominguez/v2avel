import { useCallback, useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { getSignedUrl } from '@/utils/storageUrl';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

/**
 * Ver un adjunto a tamaño completo.
 *
 * Dos cosas que hay que hacer aquí y no antes:
 *
 * 1. La dirección firmada se pide AL TOCAR la foto, no al abrir la escala.
 *    Las firmas caducan, y una escala se trabaja durante horas: al abrirla a
 *    las 20:00 y tocar la foto a las 22:11 la firma ya no valía y salía una
 *    pantalla negra con «InvalidJWT». Las miniaturas seguían viéndose porque
 *    el navegador ya las tenía cargadas, y por eso despistaba tanto.
 *
 * 2. Se muestra dentro de la app y no con `window.open`. Tras un `await` el
 *    navegador bloquea la apertura de pestañas por considerarla no pedida por
 *    el usuario: es el mismo motivo por el que no se abrían las capturas de
 *    los reportes de fallo.
 */
export function useAttachmentLightbox() {
  const [abierto, setAbierto] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const abrir = useCallback(async (ruta: string | null | undefined) => {
    if (!ruta) return;
    setAbierto(true);
    setUrl(null);
    setError(false);
    try {
      const fresca = await getSignedUrl(ruta);
      if (fresca) setUrl(fresca);
      else setError(true);
    } catch {
      setError(true);
    }
  }, []);

  const node = (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-6">
            <span>Adjunto</span>
            {url && (
              // Enlace de verdad: un `window.open` aquí lo bloquearía el navegador.
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm font-medium text-primary"
              >
                <ExternalLink className="h-4 w-4" /> Abrir aparte
              </a>
            )}
          </DialogTitle>
        </DialogHeader>

        {error ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No se pudo cargar el archivo. Comprueba la conexión y vuelve a intentarlo.
          </p>
        ) : url ? (
          <img
            src={url}
            alt="Adjunto de la escala"
            className="max-h-[75vh] w-full rounded-lg object-contain"
            onError={() => setError(true)}
          />
        ) : (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  return { abrir, node };
}
