import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronDown, ChevronUp, ExternalLink, History, Loader2, RefreshCw, RotateCcw, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { etiquetaDeHora } from '@/utils/etiquetasHoras';
import { NO_SON_DEL_OPERARIO } from '@/utils/guardadoSeguro';
import { setImpersonatedUser } from '@/utils/adminImpersonation';

interface Version {
  id: string;
  turnaround_id: string;
  user_id: string;
  flight_number: string | null;
  date: string | null;
  times: Record<string, unknown> | null;
  horas_antes: number | null;
  horas_despues: number | null;
  saved_at: string;
}

interface Props {
  usuarios?: { user_id: string; email: string; display_name: string | null }[];
}

/** El trigger marca con -1 la copia que se hace justo antes de restaurar. */
const esCopiaDeSeguridadDeRestauracion = (v: Version) => v.horas_antes === -1;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Las horas de una versión, con nombre legible y en orden.
 *
 * Sólo las del operario: las de ARION (STA, STD, ETD, hora de salida) las
 * pone el sistema solo y nadie las pierde, así que enseñarlas aquí era ruido
 * y además inflaba la cuenta de horas.
 */
export const horasDeVersion = (times: Record<string, unknown> | null | undefined) =>
  Object.entries(times ?? {})
    .filter(([k, v]) => !NO_SON_DEL_OPERARIO.has(k) && typeof v === 'string' && HORA.test(v))
    .map(([clave, v]) => ({ clave, etiqueta: etiquetaDeHora(clave), valor: v as string }))
    .sort((a, b) => a.valor.localeCompare(b.valor));

/**
 * Recuperación de datos borrados, sin entrar en la base de datos.
 *
 * Cada vez que una escala pierde horas, la base de datos guarda antes la
 * versión anterior. Aquí se ven esas versiones y se devuelven con un botón.
 * Existe porque consultar Supabase a mano no sirve de nada en rampa: el
 * administrador está en el aeropuerto con el móvil, no en casa.
 *
 * Devolver horas sólo RELLENA lo que esté vacío. Nunca pisa una hora que haya
 * ahora, porque un rescate no puede acabar siendo un segundo borrado.
 */
export const RecuperarDatosCard: React.FC<Props> = ({ usuarios = [] }) => {
  const [versiones, setVersiones] = useState<Version[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [desplegado, setDesplegado] = useState<string | null>(null);
  const [aRestaurar, setARestaurar] = useState<Version | null>(null);
  const [restaurando, setRestaurando] = useState<string | null>(null);
  const navigate = useNavigate();


  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('turnaround_history')
        .select('id, turnaround_id, user_id, flight_number, date, times, horas_antes, horas_despues, saved_at')
        .order('saved_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setVersiones((data ?? []) as Version[]);
    } catch (e) {
      toast({
        title: 'No se pudo cargar el histórico',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const quien = useCallback((userId: string) => {
    const u = usuarios.find((x) => x.user_id === userId);
    return u?.display_name || u?.email || 'Usuario desconocido';
  }, [usuarios]);

  /**
   * Abre la escala tal y como está AHORA, antes de decidir si se restaura.
   *
   * Hace falta suplantar al dueño de la escala: el administrador no tiene
   * escalas de otros, así que sin esto se abriría vacía.
   */
  const verEscala = useCallback((v: Version) => {
    setImpersonatedUser({ userId: v.user_id, email: quien(v.user_id) });
    navigate(`/turnaround/${v.turnaround_id}`);
  }, [navigate, quien]);

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return versiones;
    return versiones.filter((v) =>
      (v.flight_number ?? '').toLowerCase().includes(q) ||
      (v.date ?? '').includes(q) ||
      quien(v.user_id).toLowerCase().includes(q));
  }, [versiones, filtro, quien]);

  const restaurar = async (v: Version) => {
    setRestaurando(v.id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('restaurar_horas', { p_history_id: v.id });
      if (error) throw error;
      const r = Array.isArray(data) ? data[0] : data;
      const n: number = r?.devueltos ?? 0;
      setARestaurar(null);
      if (n === 0) {
        toast({
          title: 'No había nada que devolver',
          description: 'Todas esas horas ya están puestas en la escala.',
        });
      } else {
        toast({
          title: `${n} ${n === 1 ? 'hora devuelta' : 'horas devueltas'}`,
          description: `${v.flight_number ?? 'La escala'} ya las tiene otra vez. El usuario las verá al abrirla.`,
        });
      }
      await cargar();
    } catch (e) {
      toast({
        title: 'No se pudieron devolver',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setRestaurando(null);
    }
  };

  const perdidas = versiones.filter((v) => !esCopiaDeSeguridadDeRestauracion(v)).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Recuperar datos borrados ({perdidas})
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={cargar} disabled={cargando} title="Recargar">
            <RefreshCw className={cargando ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAbierto((v) => !v)}>
            {abierto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {abierto ? 'Ocultar' : 'Ver histórico'}
          </Button>
        </div>
      </CardHeader>

      {abierto && (
        <CardContent className="space-y-3">
          {!cargando && versiones.length === 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <p>
                Ninguna escala ha perdido horas. Cuando pase, la versión anterior
                aparecerá aquí sola y podrás devolverla con un botón.
              </p>
            </div>
          )}

          {versiones.length > 0 && (
            <Input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar por vuelo, fecha o usuario…"
              className="h-9"
            />
          )}

          {visibles.map((v) => {
            const horas = horasDeVersion(v.times);
            const copia = esCopiaDeSeguridadDeRestauracion(v);
            return (
              <div key={v.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {v.flight_number || 'Sin número'}
                      {v.date && <span className="font-normal text-muted-foreground">
                        {' · '}{format(parseISO(v.date), "d 'de' MMMM", { locale: es })}
                      </span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {quien(v.user_id)} · {format(parseISO(v.saved_at), "d/MM HH:mm", { locale: es })}
                      {copia
                        ? ' · copia previa a una restauración'
                        : ` · se quedó en ${v.horas_despues} de ${v.horas_antes} horas`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => setDesplegado((d) => (d === v.id ? null : v.id))}
                    >
                      {desplegado === v.id ? 'Ocultar' : `Ver ${horas.length} horas`}
                    </Button>
                    <Button
                      variant="outline" size="sm" className="gap-1.5"
                      onClick={() => verEscala(v)}
                      title="Abrir la escala para ver cómo está ahora"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver escala
                    </Button>
                    <Button
                      size="sm" className="gap-1.5"
                      disabled={restaurando === v.id || horas.length === 0}
                      onClick={() => setARestaurar(v)}
                    >
                      {restaurando === v.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <RotateCcw className="h-4 w-4" />}
                      Devolver
                    </Button>
                  </div>
                </div>

                {desplegado === v.id && (
                  <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 border-t border-border pt-2 text-sm sm:grid-cols-2">
                    {horas.map((h) => (
                      <div key={h.clave} className="flex justify-between gap-2">
                        <span className="min-w-0 truncate text-muted-foreground">{h.etiqueta}</span>
                        <span className="font-mono font-semibold">{h.valor}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {visibles.length === 0 && versiones.length > 0 && (
            <p className="text-sm text-muted-foreground">Nada coincide con la búsqueda.</p>
          )}
        </CardContent>
      )}

      <AlertDialog open={!!aRestaurar} onOpenChange={(o) => { if (!o) setARestaurar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Devolver las horas a la escala</AlertDialogTitle>
            <AlertDialogDescription>
              {aRestaurar && (
                <>
                  Se van a poner en {aRestaurar.flight_number ?? 'la escala'} las horas de
                  esta versión que ahora estén en blanco. Lo que ya tenga una hora
                  puesta no se toca, y queda una copia de cómo está ahora por si
                  hiciera falta deshacerlo.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => aRestaurar && restaurar(aRestaurar)}>
              Devolver las horas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default RecuperarDatosCard;
