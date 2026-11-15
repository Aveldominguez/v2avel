import React, { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CloudDownload, Loader2, RefreshCw, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  DIAS_DE_HISTORICO, observacionesDeLaVentana, peorDelIntervalo, resumenMeteo,
  ventanaDeEscala, type MeteoEscala, type ObsCruda,
} from '@/utils/meteoEscala';

interface Escala {
  id: string;
  flight_number: string | null;
  date: string;
  times: Record<string, unknown> | null;
}

/**
 * Rellena de una vez la meteorología de las escalas de esta semana.
 *
 * El aeropuerto guarda unos 8 días de partes. Dentro de esa ventana, las
 * escalas trabajadas antes de que existiera el registro todavía se pueden
 * documentar; pasados esos días ya no hay nada que recuperar.
 *
 * Se pide el histórico UNA vez para todas y después se reparte: pedirlo por
 * escala serían decenas de llamadas para traer exactamente lo mismo.
 */
export const MeteoPendienteCard: React.FC = () => {
  const [pendientes, setPendientes] = useState<Escala[]>([]);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [hechas, setHechas] = useState<string[]>([]);

  const desdeIso = useCallback(
    () => new Date(Date.now() - DIAS_DE_HISTORICO * 86_400_000).toISOString(),
    [],
  );

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const desdeFecha = desdeIso().slice(0, 10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('turnarounds')
        .select('id, flight_number, date, times')
        .gte('date', desdeFecha)
        .order('date', { ascending: false })
        .limit(200);
      if (error) throw error;

      const sinMeteo = ((data ?? []) as Escala[]).filter(
        (e) => !e.times?.meteo && ventanaDeEscala(parseISO(e.date), e.times ?? {}),
      );
      setPendientes(sinMeteo);
    } catch (e) {
      toast({
        title: 'No se pudieron mirar las escalas',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setCargando(false);
    }
  }, [desdeIso]);

  useEffect(() => { void cargar(); }, [cargar]);

  const rellenar = async () => {
    setTrabajando(true);
    const logradas: string[] = [];
    try {
      // Una sola petición del histórico para todas las escalas.
      const { data, error } = await supabase.functions.invoke('meteo-escala', {
        body: { desde: desdeIso() },
      });
      if (error) throw error;
      const cuerpo = (data ?? {}) as { observaciones?: ObsCruda[]; taf?: string | null };
      const crudas = cuerpo.observaciones ?? [];

      for (const e of pendientes) {
        const v = ventanaDeEscala(parseISO(e.date), e.times ?? {});
        if (!v) continue;
        const obs = observacionesDeLaVentana(crudas, v);
        if (obs.length === 0) continue;

        const meteo: MeteoEscala = {
          ventana: { desde: v.desde.toISOString(), hasta: v.hasta.toISOString() },
          registradoEn: new Date().toISOString(),
          observaciones: obs,
          maximo: peorDelIntervalo(obs),
          // La previsión de aquel día ya no existe: sólo hay el TAF de ahora,
          // y ponerlo haría pensar que era lo que se preveía entonces.
          taf: null,
          prevision: null,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: ok, error: errRpc } = await (supabase as any)
          .rpc('rellenar_meteo_escala', { p_id: e.id, p_meteo: meteo });
        if (errRpc) throw errRpc;
        if (ok) logradas.push(`${e.flight_number ?? 'escala'} · ${resumenMeteo(meteo) || 'sin alerta'}`);
      }

      setHechas(logradas);
      toast({
        title: logradas.length === 0
          ? 'No había partes para esas escalas'
          : `${logradas.length} ${logradas.length === 1 ? 'escala documentada' : 'escalas documentadas'}`,
      });
      await cargar();
    } catch (e) {
      toast({
        title: 'No se pudo rellenar',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Wind className="h-5 w-5 text-primary" />
          Meteorología pendiente ({pendientes.length})
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={cargar} disabled={cargando} title="Recargar">
          <RefreshCw className={cargando ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {pendientes.length === 0 && !cargando && (
          <p className="text-sm text-muted-foreground">
            Todas las escalas de los últimos {DIAS_DE_HISTORICO} días tienen su meteorología
            registrada. De las anteriores el aeropuerto ya no guarda los partes.
          </p>
        )}

        {pendientes.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              {pendientes.length} {pendientes.length === 1 ? 'escala trabajada' : 'escalas trabajadas'} de
              los últimos {DIAS_DE_HISTORICO} días sin meteorología. Todavía se puede pedir al aeropuerto.
            </p>
            <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
              {pendientes.slice(0, 12).map((e) => (
                <span key={e.id} className="rounded-full bg-muted px-2 py-0.5">
                  {e.flight_number ?? '—'} · {format(parseISO(e.date), 'd/MM', { locale: es })}
                </span>
              ))}
              {pendientes.length > 12 && <span>y {pendientes.length - 12} más</span>}
            </div>
            <Button className="w-full gap-2" disabled={trabajando} onClick={rellenar}>
              {trabajando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />}
              {trabajando ? 'Pidiendo al aeropuerto…' : `Registrar las ${pendientes.length}`}
            </Button>
          </>
        )}

        {hechas.length > 0 && (
          <div className="space-y-1 rounded-lg border border-border p-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Documentadas</p>
            {hechas.map((t) => <p key={t} className="text-xs">{t}</p>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MeteoPendienteCard;
