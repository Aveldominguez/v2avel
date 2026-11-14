import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronDown, ChevronUp, ExternalLink, History, Loader2, RefreshCw, RotateCcw, ShieldCheck, Trash2,
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
import { resumirCopia, type CopiaHistorico } from '@/utils/resumenRecuperacion';
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
  motivo?: string | null;
  field_values?: unknown;
  observations?: string | null;
  extra?: { bulk?: unknown[]; loadSheet?: unknown[] } | null;
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
  const [aBorrar, setABorrar] = useState<Version | null>(null);
  const [limpiando, setLimpiando] = useState(false);
  const [confirmarLimpieza, setConfirmarLimpieza] = useState(false);
  const [restaurando, setRestaurando] = useState<string | null>(null);
  const navigate = useNavigate();


  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('turnaround_history')
        .select('id, turnaround_id, user_id, flight_number, date, times, field_values, observations, extra, motivo, horas_antes, horas_despues, saved_at')
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

  /** Días a partir de los cuales una copia se considera vieja para limpiar. */
  const DIAS_VIEJAS = 30;

  const viejas = useMemo(() => {
    const limite = Date.now() - DIAS_VIEJAS * 24 * 60 * 60 * 1000;
    return versiones.filter((v) => new Date(v.saved_at).getTime() < limite);
  }, [versiones]);

  const borrar = async (ids: string[], queEra: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('turnaround_history').delete().in('id', ids);
      if (error) throw error;
      setVersiones((prev) => prev.filter((v) => !ids.includes(v.id)));
      toast({ title: queEra });
    } catch (e) {
      toast({
        title: 'No se pudo borrar',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    }
  };

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
            <p className="text-xs text-muted-foreground">
              Las copias que se guardan antes de restaurar se borran solas a los 7 días.
              Las de pérdidas reales se quedan hasta que tú las quites.
            </p>
          )}

          {versiones.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar por vuelo, fecha o usuario…"
                className="h-9 sm:flex-1"
              />
              {viejas.length > 0 && (
                <Button
                  variant="outline" size="sm"
                  className="h-9 shrink-0 gap-1.5 text-destructive"
                  disabled={limpiando}
                  onClick={() => setConfirmarLimpieza(true)}
                >
                  {limpiando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Limpiar {viejas.length} de más de {DIAS_VIEJAS} días
                </Button>
              )}
            </div>
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
                        : v.motivo === 'air-canada'
                          ? ' · escaneo de Air Canada borrado'
                          : ' · se perdieron datos'}
                    </p>
                    {/* Qué trae la copia: horas, bodegas, recuentos, Air Canada… */}
                    <p className="text-xs font-medium text-primary">{resumirCopia(v as unknown as CopiaHistorico)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost" size="sm"
                      disabled={horas.length === 0}
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
                      variant="ghost" size="icon"
                      className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => setABorrar(v)}
                      title="Eliminar esta copia"
                      aria-label={`Eliminar la copia de ${v.flight_number ?? 'la escala'}`}
                    >
                      <Trash2 className="h-4 w-4" />
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

      <AlertDialog open={!!aBorrar} onOpenChange={(o) => { if (!o) setABorrar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar esta copia</AlertDialogTitle>
            <AlertDialogDescription>
              {aBorrar && (
                <>
                  Vas a borrar la copia de {aBorrar.flight_number ?? 'esta escala'} con{' '}
                  {resumirCopia(aBorrar as unknown as CopiaHistorico)}.{' '}
                  <strong>No se puede deshacer</strong>: si esos datos faltan en la escala,
                  dejarán de poder recuperarse. La escala no se toca.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const v = aBorrar;
                setABorrar(null);
                if (v) void borrar([v.id], 'Copia eliminada');
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmarLimpieza} onOpenChange={setConfirmarLimpieza}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpiar las copias antiguas</AlertDialogTitle>
            <AlertDialogDescription>
              Se van a borrar <strong>{viejas.length}</strong>{' '}
              {viejas.length === 1 ? 'copia de más' : 'copias de más'} de {DIAS_VIEJAS} días.
              Las más recientes se quedan. <strong>No se puede deshacer</strong>, pero a
              estas alturas esas escalas ya están cerradas y entregadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setConfirmarLimpieza(false);
                setLimpiando(true);
                await borrar(viejas.map((v) => v.id), `${viejas.length} copias eliminadas`);
                setLimpiando(false);
              }}
            >
              Limpiar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
