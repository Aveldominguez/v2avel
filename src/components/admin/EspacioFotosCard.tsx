import React, { useCallback, useRef, useState } from 'react';
import { HardDrive, Loader2, Play, RefreshCw, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ahorroEstimado, enMegas, mereceReemplazo, recomprimir, valeLaPenaTocar,
  type FotoEnServidor,
} from '@/utils/recomprimirFotos';

const CUBOS = ['loading-sheets', 'turnaround-files'] as const;
const POR_PAGINA = 100;

interface Estado {
  fotos: FotoEnServidor[];
  ocupado: number;
}

/**
 * Adelgazar las fotos que ya están subidas, sin borrar ninguna.
 *
 * Las antiguas se guardaron en JPEG y pesan el doble de lo que pesarían en
 * WebP a la misma resolución. Aquí se bajan, se recomprimen en el navegador
 * y se vuelven a subir A LA MISMA RUTA, así que ni las escalas ni las copias
 * del histórico se enteran: siguen apuntando donde apuntaban.
 *
 * Va por tandas y se puede parar en cualquier momento. Lo ya hecho queda
 * hecho: no hay un «todo o nada» que obligue a empezar de cero.
 */
export const EspacioFotosCard: React.FC = () => {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [hechas, setHechas] = useState(0);
  const [ahorrado, setAhorrado] = useState(0);
  const [saltadas, setSaltadas] = useState(0);
  const parar = useRef(false);

  /** Recorre un cubo entero: primero las carpetas de cada usuario, luego sus ficheros. */
  const listarCubo = async (cubo: string): Promise<FotoEnServidor[]> => {
    const fuera: FotoEnServidor[] = [];
    const { data: carpetas, error } = await supabase.storage.from(cubo).list('', { limit: 1000 });
    if (error) throw error;
    for (const carpeta of carpetas ?? []) {
      // Una entrada sin metadatos es una carpeta (el id de un usuario).
      if (carpeta.metadata) continue;
      let desde = 0;
      for (;;) {
        const { data, error: e2 } = await supabase.storage
          .from(cubo)
          .list(carpeta.name, { limit: POR_PAGINA, offset: desde });
        if (e2) throw e2;
        const lote = data ?? [];
        lote.forEach((o) => {
          const bytes = Number((o.metadata as Record<string, unknown> | null)?.size ?? 0);
          if (!bytes) return;
          fuera.push({
            bucket: cubo,
            ruta: `${carpeta.name}/${o.name}`,
            bytes,
            tipo: (o.metadata as Record<string, unknown> | null)?.mimetype as string | undefined,
          });
        });
        if (lote.length < POR_PAGINA) break;
        desde += POR_PAGINA;
      }
    }
    return fuera;
  };

  const analizar = useCallback(async () => {
    setAnalizando(true);
    try {
      const todas: FotoEnServidor[] = [];
      for (const cubo of CUBOS) todas.push(...await listarCubo(cubo));
      setEstado({ fotos: todas, ocupado: todas.reduce((n, f) => n + f.bytes, 0) });
      setHechas(0); setAhorrado(0); setSaltadas(0);
    } catch (e) {
      console.error('[espacio] no se pudo listar', e);
      toast({ title: 'No se pudieron leer las fotos', variant: 'destructive' });
    } finally {
      setAnalizando(false);
    }
  }, []);

  const trabajar = useCallback(async () => {
    if (!estado) return;
    const cola = estado.fotos.filter(valeLaPenaTocar);
    if (cola.length === 0) {
      toast({ title: 'No hay nada que adelgazar', description: 'Todas están ya en WebP o son pequeñas.' });
      return;
    }
    parar.current = false;
    setTrabajando(true);
    let ganado = 0, ok = 0, fuera = 0;

    for (const foto of cola) {
      if (parar.current) break;
      try {
        const { data, error } = await supabase.storage.from(foto.bucket).download(foto.ruta);
        if (error || !data) { fuera += 1; setSaltadas(fuera); continue; }

        const nueva = await recomprimir(data);
        if (!nueva || !mereceReemplazo(foto.bytes, nueva.size)) {
          fuera += 1; setSaltadas(fuera); continue;
        }

        // Misma ruta y upsert: el fichero se sustituye de una pieza. Si esto
        // falla, no se ha tocado nada y la foto original sigue intacta.
        const { error: errSubida } = await supabase.storage
          .from(foto.bucket)
          .upload(foto.ruta, nueva, { upsert: true, contentType: 'image/webp' });
        if (errSubida) { fuera += 1; setSaltadas(fuera); continue; }

        ganado += foto.bytes - nueva.size;
        ok += 1;
        setHechas(ok); setAhorrado(ganado);
      } catch (e) {
        console.warn('[espacio] se salta una foto', foto.ruta, e);
        fuera += 1; setSaltadas(fuera);
      }
    }

    setTrabajando(false);
    toast({
      title: parar.current ? 'Parado' : 'Terminado',
      description: `${ok} fotos adelgazadas · ${enMegas(ganado)} recuperados${fuera ? ` · ${fuera} sin tocar` : ''}`,
    });
  }, [estado]);

  const cola = estado?.fotos.filter(valeLaPenaTocar) ?? [];
  const progreso = cola.length ? Math.round(((hechas + saltadas) / cola.length) * 100) : 0;

  return (
    <Card className="card-operational">
      <CardHeader className="aero-equipment-header py-3">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 rounded-lg bg-muted">
            <HardDrive className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-left min-w-0">
            <span>Espacio de las fotos</span>
            <p className="text-xs font-normal text-muted-foreground mt-0.5">
              Las pasa a WebP sin bajar la resolución. No borra ninguna.
            </p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 pt-4">
        {!estado ? (
          <Button type="button" onClick={analizar} disabled={analizando} className="w-full gap-2">
            {analizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {analizando ? 'Mirando…' : 'Analizar'}
          </Button>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-border p-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ocupado</p>
                <p className="font-mono font-bold">{enMegas(estado.ocupado)}</p>
              </div>
              <div className="rounded-lg border border-border p-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Se pueden adelgazar</p>
                <p className="font-mono font-bold">{cola.length}</p>
              </div>
              <div className="rounded-lg border border-border p-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Se ganaría</p>
                <p className="font-mono font-bold">~{enMegas(ahorroEstimado(estado.fotos))}</p>
              </div>
            </div>

            {(trabajando || hechas > 0 || saltadas > 0) && (
              <div className="space-y-1">
                <Progress value={progreso} />
                <p className="text-sm text-muted-foreground">
                  {hechas} adelgazadas · {enMegas(ahorrado)} recuperados
                  {saltadas > 0 && ` · ${saltadas} sin tocar`}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button" onClick={trabajar} disabled={trabajando || cola.length === 0}
                className="flex-1 gap-2"
              >
                {trabajando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {trabajando ? 'Adelgazando…' : 'Empezar'}
              </Button>
              {trabajando ? (
                <Button
                  type="button" variant="outline" className="gap-2"
                  onClick={() => { parar.current = true; }}
                >
                  <Square className="h-4 w-4" /> Parar
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={analizar} disabled={analizando} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Volver a mirar
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Cada foto se sube a su misma ruta, así que las escalas y las copias del
              histórico siguen encontrándola. Se puede parar cuando quieras: lo hecho
              queda hecho.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EspacioFotosCard;
