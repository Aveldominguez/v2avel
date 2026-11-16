import React, { useCallback, useRef, useState } from 'react';
import { Loader2, Play, RefreshCw, Square, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { enMegas, mudarUna, totalBytes, type FotoAMudar, type Fallo } from '@/utils/mudarFotos';

const CUBOS = ['loading-sheets', 'turnaround-files'] as const;
const POR_PAGINA = 100;

const POR_QUE: Record<Fallo, string> = {
  'sin-bajar': 'no se pudo leer de Supabase',
  'sin-subir': 'no se pudo copiar a R2',
  'sin-verificar': 'la copia no se leía bien',
  'sin-borrar': 'copiada, pero sigue en Supabase',
};

/**
 * Mudar a Cloudflare R2 las fotos que ya están en Supabase.
 *
 * Copiar, comprobar que se lee, y sólo entonces borrar. Si algo falla, la
 * foto sigue en Supabase y se ve igual: lo peor que puede pasar es que acabe
 * en los dos sitios.
 *
 * No se toca ninguna escala. La referencia guardada sigue diciendo
 * «loading-sheets:…» y la app la busca en R2 con la misma ruta cuando
 * Supabase ya no la tiene. Por eso esto no puede romper una escala.
 */
export const MudarFotosCard: React.FC = () => {
  const [fotos, setFotos] = useState<FotoAMudar[] | null>(null);
  const [mirando, setMirando] = useState(false);
  const [mudando, setMudando] = useState(false);
  const [hechas, setHechas] = useState(0);
  const [liberado, setLiberado] = useState(0);
  const [fallos, setFallos] = useState<Record<string, number>>({});
  const parar = useRef(false);

  const listarCubo = async (cubo: string): Promise<FotoAMudar[]> => {
    const fuera: FotoAMudar[] = [];
    const { data: carpetas, error } = await supabase.storage.from(cubo).list('', { limit: 1000 });
    if (error) throw error;
    for (const carpeta of carpetas ?? []) {
      if (carpeta.metadata) continue; // es un fichero suelto, no una carpeta
      let desde = 0;
      for (;;) {
        const { data, error: e2 } = await supabase.storage
          .from(cubo).list(carpeta.name, { limit: POR_PAGINA, offset: desde });
        if (e2) throw e2;
        const lote = data ?? [];
        lote.forEach((o) => {
          const bytes = Number((o.metadata as Record<string, unknown> | null)?.size ?? 0);
          if (bytes) fuera.push({ bucket: cubo, ruta: `${carpeta.name}/${o.name}`, bytes });
        });
        if (lote.length < POR_PAGINA) break;
        desde += POR_PAGINA;
      }
    }
    return fuera;
  };

  const mirar = useCallback(async () => {
    setMirando(true);
    try {
      const todas: FotoAMudar[] = [];
      for (const cubo of CUBOS) todas.push(...await listarCubo(cubo));
      setFotos(todas);
      setHechas(0); setLiberado(0); setFallos({});
    } catch (e) {
      console.error('[mudanza] no se pudo listar', e);
      toast({ title: 'No se pudieron leer las fotos', variant: 'destructive' });
    } finally {
      setMirando(false);
    }
  }, []);

  const mudar = useCallback(async () => {
    if (!fotos?.length) return;
    parar.current = false;
    setMudando(true);
    let ok = 0, ganado = 0;
    const malas: Record<string, number> = {};

    for (const foto of fotos) {
      if (parar.current) break;
      try {
        const r = await mudarUna(foto);
        if (r.mudada) {
          ok += 1; ganado += foto.bytes;
          setHechas(ok); setLiberado(ganado);
        } else if (r.fallo) {
          malas[r.fallo] = (malas[r.fallo] ?? 0) + 1;
          setFallos({ ...malas });
        }
      } catch (e) {
        console.warn('[mudanza] se salta', foto.ruta, e);
        malas['sin-bajar'] = (malas['sin-bajar'] ?? 0) + 1;
        setFallos({ ...malas });
      }
    }

    setMudando(false);
    toast({
      title: parar.current ? 'Parado' : 'Terminado',
      description: `${ok} fotos mudadas · ${enMegas(ganado)} liberados en Supabase`,
    });
  }, [fotos]);

  const pendientes = fotos?.length ?? 0;
  const tocadas = hechas + Object.values(fallos).reduce((a, b) => a + b, 0);
  const progreso = pendientes ? Math.round((tocadas / pendientes) * 100) : 0;

  return (
    <Card className="card-operational">
      <CardHeader className="aero-equipment-header py-3">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 rounded-lg bg-muted">
            <Truck className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-left min-w-0">
            <span>Mudar las fotos a Cloudflare</span>
            <p className="text-xs font-normal text-muted-foreground mt-0.5">
              Copia, comprueba y sólo entonces borra de Supabase.
            </p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 pt-4">
        {!fotos ? (
          <Button type="button" onClick={mirar} disabled={mirando} className="w-full gap-2">
            {mirando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {mirando ? 'Mirando…' : 'Ver qué queda en Supabase'}
          </Button>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border p-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Por mudar</p>
                <p className="font-mono font-bold">{pendientes}</p>
              </div>
              <div className="rounded-lg border border-border p-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Se liberaría</p>
                <p className="font-mono font-bold">{enMegas(totalBytes(fotos))}</p>
              </div>
            </div>

            {(mudando || tocadas > 0) && (
              <div className="space-y-1">
                <Progress value={progreso} />
                <p className="text-sm text-muted-foreground">
                  {hechas} mudadas · {enMegas(liberado)} liberados
                </p>
                {Object.entries(fallos).map(([f, n]) => (
                  <p key={f} className="text-xs text-destructive">
                    {n} {POR_QUE[f as Fallo] ?? f}
                  </p>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={mudar} disabled={mudando || pendientes === 0} className="flex-1 gap-2">
                {mudando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {mudando ? 'Mudando…' : 'Empezar'}
              </Button>
              {mudando ? (
                <Button type="button" variant="outline" className="gap-2" onClick={() => { parar.current = true; }}>
                  <Square className="h-4 w-4" /> Parar
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={mirar} disabled={mirando} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Volver a mirar
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Cada foto se copia, se comprueba que se lee desde Cloudflare y sólo
              entonces se quita de Supabase. Las escalas no se tocan: siguen
              encontrando sus fotos igual. Se puede parar cuando quieras.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MudarFotosCard;
