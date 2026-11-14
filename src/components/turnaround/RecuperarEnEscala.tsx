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
import { copiasUtiles, resumirCopia, type CopiaHistorico } from '@/utils/resumenRecuperacion';
import { AvisoDestacado, BotonDeAviso } from '@/components/AvisoDestacado';

interface Props {
  turnaroundId?: string;
  /** Con cambios en pantalla sin guardar no se restaura: se perderían. */
  hayCambiosSinGuardar: boolean;
}

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
export const RecuperarEnEscala: React.FC<Props> = ({ turnaroundId, hayCambiosSinGuardar }) => {
  const [copias, setCopias] = useState<CopiaHistorico[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [restaurando, setRestaurando] = useState<string | null>(null);
  const [aRestaurar, setARestaurar] = useState<CopiaHistorico | null>(null);

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
      setCopias(copiasUtiles((data ?? []) as CopiaHistorico[]));
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
      toast({
        title: `${n} ${n === 1 ? 'dato recuperado' : 'datos recuperados'}`,
        description: 'Se vuelve a abrir la escala para que los veas.',
      });
      // La escala se recarga del servidor: es la única forma de que lo
      // recuperado aparezca en pantalla sin mezclarlo con lo que hubiera.
      setTimeout(() => window.location.reload(), 1200);
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
        <BotonDeAviso onClick={() => setAbierto((v) => !v)}>
          {abierto ? 'Ocultar' : 'Ver qué se puede recuperar'}
        </BotonDeAviso>
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
