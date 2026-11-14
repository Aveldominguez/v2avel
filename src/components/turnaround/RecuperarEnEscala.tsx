import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { History, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  bodegasDeCopia, copiasUtiles, horasDeCopia, recuentosDeCopia, resumirCopia,
  type CopiaHistorico, type Dato,
} from '@/utils/resumenRecuperacion';
import { AvisoDestacado, BotonDeAviso } from '@/components/AvisoDestacado';

/**
 * Copias que el operario ya ha restaurado o ha decidido ignorar.
 *
 * La copia se queda en el histórico para siempre —es la prueba de lo que
 * había—, así que sin esto el aviso no se iba nunca y acababa siendo ruido
 * que se pasa por alto, que es justo lo contrario de lo que se busca.
 */
const CLAVE_ATENDIDAS = 'recuperaciones_atendidas_v1';

const leerAtendidas = (): string[] => {
  try { return JSON.parse(localStorage.getItem(CLAVE_ATENDIDAS) || '[]'); } catch { return []; }
};

const marcarAtendida = (id: string) => {
  try {
    const ya = leerAtendidas();
    if (!ya.includes(id)) localStorage.setItem(CLAVE_ATENDIDAS, JSON.stringify([...ya, id].slice(-200)));
  } catch { /* sin almacén: el aviso seguirá saliendo, que es lo menos malo */ }
};

interface Props {
  turnaroundId?: string;
  /** Con cambios en pantalla sin guardar no se restaura: se perderían. */
  hayCambiosSinGuardar: boolean;
  /**
   * Avisa al formulario de que acaba de restaurarse algo, para que deje de
   * guardar antes de recargar. Sin esto, la pantalla —que sigue con los datos
   * viejos— vuelve a subirlos encima de lo recién recuperado. Pasó dos veces
   * seguidas en la PC1099 el 14/11.
   */
  onAntesDeRecargar?: () => void;
}

/** Un grupo de datos del detalle. No se pinta si no hay nada que enseñar. */
const Bloque: React.FC<{ titulo: string; filas: Dato[] }> = ({ titulo, filas }) =>
  filas.length === 0 ? null : (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{titulo}</p>
      <div className="mt-0.5 space-y-0.5">
        {filas.map((f) => (
          <div key={f.etiqueta + f.valor} className="flex justify-between gap-3 text-xs">
            <span className="min-w-0 text-slate-600">{f.etiqueta}</span>
            <span className="shrink-0 font-mono font-bold text-slate-900">{f.valor}</span>
          </div>
        ))}
      </div>
    </div>
  );

/**
 * Datos recuperables de ESTA escala, para que el operario se los devuelva él.
 *
 * Antes sólo el administrador podía recuperar lo perdido, y había que pedírselo
 * y esperar. Aquí lo ve quien lo ha sufrido, en la pantalla donde se dio cuenta
 * de que faltaba algo, y lo arregla en el momento.
 *
 * Sólo aparece si de verdad hay algo que devolver: una escala sana no enseña
 * nada, porque un aviso que sale siempre deja de leerse.
 */
export const RecuperarEnEscala: React.FC<Props> = ({
  turnaroundId, hayCambiosSinGuardar, onAntesDeRecargar,
}) => {
  const [copias, setCopias] = useState<CopiaHistorico[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [restaurando, setRestaurando] = useState<string | null>(null);
  const [aRestaurar, setARestaurar] = useState<CopiaHistorico | null>(null);
  /** Qué copia tiene el detalle abierto. Sólo una a la vez: el móvil es estrecho. */
  const [detalle, setDetalle] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!turnaroundId) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('turnaround_history')
        .select('id, saved_at, motivo, horas_antes, times, field_values, observations, extra')
        .eq('turnaround_id', turnaroundId)
        .order('saved_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const atendidas = leerAtendidas();
      setCopias(copiasUtiles((data ?? []) as CopiaHistorico[]).filter((c) => !atendidas.includes(c.id)));
    } catch {
      // Sin conexión no se puede mirar; se reintenta al volver a abrir la escala.
    }
  }, [turnaroundId]);

  useEffect(() => { void cargar(); }, [cargar]);

  const restaurar = async (c: CopiaHistorico) => {
    setRestaurando(c.id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('restaurar_horas', { p_history_id: c.id });
      if (error) throw error;
      const r = Array.isArray(data) ? data[0] : data;
      const n: number = r?.devueltos ?? 0;
      setARestaurar(null);
      if (n === 0) {
        toast({ title: 'No había nada que devolver', description: 'Esos datos ya están en la escala.' });
        return;
      }
      marcarAtendida(c.id);
      toast({
        title: `${n} ${n === 1 ? 'dato recuperado' : 'datos recuperados'}`,
        description: 'Se vuelve a abrir la escala para que los veas.',
      });
      // Primero se le dice al formulario que deje de guardar: lo que tiene en
      // pantalla está desfasado y subirlo borraría lo que acaba de volver.
      // Después se recarga EN EL ACTO, sin esperar: ese segundo de espera era
      // tiempo de sobra para que saltara un guardado automático.
      onAntesDeRecargar?.();
      window.location.reload();
    } catch (e) {
      toast({
        title: 'No se pudo recuperar',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setRestaurando(null);
    }
  };

  if (copias.length === 0) return null;

  return (
    <AvisoDestacado
      icono={<History size={20} />}
      titulo={copias.length === 1
        ? 'Esta escala tiene datos que puedes recuperar'
        : `Esta escala tiene ${copias.length} copias con datos que puedes recuperar`}
      acciones={
        <div className="flex gap-2">
          <BotonDeAviso onClick={() => setAbierto((v) => !v)}>
            {abierto ? 'Ocultar' : 'Ver qué se puede recuperar'}
          </BotonDeAviso>
          <BotonDeAviso
            className="w-auto shrink-0 bg-white/20 px-3 text-white"
            title="No volver a avisar de estas copias en esta escala"
            onClick={() => {
              copias.forEach((c) => marcarAtendida(c.id));
              setCopias([]);
            }}
          >
            No avisar más
          </BotonDeAviso>
        </div>
      }
    >
      Se guardaron solas cuando algo desapareció. Míralas antes de rehacer el trabajo a mano.

      {abierto && (
        <div className="mt-2 space-y-2">
          {hayCambiosSinGuardar && (
            <p className="rounded-md bg-amber-100 p-2 text-xs font-semibold text-amber-900">
              Tienes cambios sin guardar. Pulsa Guardar antes de recuperar, o se perderán.
            </p>
          )}
          {copias.map((c) => (
            // Tarjeta blanca sólida: sobre el azul del aviso, un fondo
            // semitransparente se emborrona y el texto deja de leerse.
            <div key={c.id} className="rounded-lg bg-white p-2.5 text-slate-900">
              <p className="text-sm font-bold">{resumirCopia(c)}</p>
              <p className="text-xs text-slate-600">
                {format(new Date(c.saved_at), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
                {c.motivo === 'air-canada' ? ' · escaneo de Air Canada' : ''}
              </p>
              {/*
                Qué se va a recuperar, con nombre y valor. Sin esto hay que
                decidir a ciegas: saber que hay "13 horas" no dice si son las
                que faltan.
              */}
              <Button
                type="button" variant="ghost" size="sm"
                className="mt-1 h-7 w-full text-xs text-primary"
                onClick={() => setDetalle((d) => (d === c.id ? null : c.id))}
              >
                {detalle === c.id ? 'Ocultar el detalle' : 'Ver qué contiene'}
              </Button>

              {detalle === c.id && (
                <div className="mt-1 space-y-2 border-t border-slate-200 pt-2">
                  <Bloque titulo="Horas" filas={horasDeCopia(c)} />
                  <Bloque titulo="Bodegas" filas={bodegasDeCopia(c)} />
                  <Bloque titulo="Contenido de bodegas" filas={recuentosDeCopia(c)} />
                  {(c.observations ?? '').trim() && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Observaciones</p>
                      <p className="text-xs text-slate-700">{c.observations}</p>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="button" size="sm" className="mt-2 w-full gap-1.5"
                disabled={restaurando === c.id || hayCambiosSinGuardar}
                onClick={() => setARestaurar(c)}
              >
                {restaurando === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Recuperar estos datos
              </Button>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!aRestaurar} onOpenChange={(o) => { if (!o) setARestaurar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recuperar los datos de esta copia</AlertDialogTitle>
            <AlertDialogDescription>
              {aRestaurar && (
                <>
                  Se van a devolver a la escala los datos de esta copia
                  ({resumirCopia(aRestaurar)}) que ahora estén en blanco. Lo que ya
                  tengas puesto no se toca, y queda una copia de cómo está ahora por
                  si hiciera falta deshacerlo.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => aRestaurar && restaurar(aRestaurar)}>
              Recuperar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AvisoDestacado>
  );
};

export default RecuperarEnEscala;
