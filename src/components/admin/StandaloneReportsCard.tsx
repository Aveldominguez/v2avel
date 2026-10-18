import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle, ChevronDown, ChevronUp, FileDown, Loader2, MapPin, RefreshCw, Trash2, UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateIncidentPdf } from '@/utils/generateIncidentPdf';
import { fechaImpresa, nombreArchivoInforme, resumenInforme } from '@/components/StandaloneReportDialog';

export interface StandaloneReport {
  id: string;
  user_id: string;
  author_name: string;
  report_date: string;
  location: string | null;
  description: string;
  created_at: string;
}

interface StandaloneReportsCardProps {
  /** Para poder filtrar por persona enseñando su correo, no sólo el nombre. */
  usuarios?: { user_id: string; email: string; display_name: string | null }[];
}

/**
 * Los informes de incidente que no van ligados a una escala, todos juntos.
 *
 * Son los que se hacen desde la pantalla de inicio. El administrador puede
 * leerlos enteros —un informe de incidente es justo lo que un responsable
 * tiene que poder leer— y reexportar el PDF tal cual lo entregó quien lo
 * escribió.
 *
 * La lista nace plegada y cada informe se abre uno a uno: con el texto
 * completo de todos a la vez, el panel se hacía kilométrico y había que
 * bajar media pantalla para llegar a lo siguiente.
 */
export const StandaloneReportsCard: React.FC<StandaloneReportsCardProps> = ({ usuarios = [] }) => {
  const [informes, setInformes] = useState<StandaloneReport[]>([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [aBorrar, setABorrar] = useState<StandaloneReport | null>(null);
  const [filtro, setFiltro] = useState('');
  const [autor, setAutor] = useState('TODOS');
  const [abierto, setAbierto] = useState(false);
  const [desplegado, setDesplegado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('standalone_reports')
        .select('id, user_id, author_name, report_date, location, description, created_at')
        .order('report_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      setInformes((data ?? []) as StandaloneReport[]);
    } catch (e) {
      toast({
        title: 'No se pudieron cargar los informes',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  /**
   * Quién ha escrito informes. Sale de los propios informes y no de la lista
   * de usuarios para no ofrecer veinte nombres que no tienen ninguno; el
   * correo se añade cuando se conoce, que es como se distingue a dos personas
   * que se llamen igual.
   */
  const autores = useMemo(() => {
    const porId = new Map<string, { id: string; etiqueta: string; cuantos: number }>();
    for (const r of informes) {
      const previo = porId.get(r.user_id);
      if (previo) { previo.cuantos += 1; continue; }
      const u = usuarios.find((x) => x.user_id === r.user_id);
      porId.set(r.user_id, {
        id: r.user_id,
        etiqueta: u?.email ? `${r.author_name} · ${u.email}` : r.author_name,
        cuantos: 1,
      });
    }
    return [...porId.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
  }, [informes, usuarios]);

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return informes.filter((r) => {
      if (autor !== 'TODOS' && r.user_id !== autor) return false;
      if (!q) return true;
      return r.author_name.toLowerCase().includes(q) ||
        (r.location ?? '').toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q);
    });
  }, [informes, filtro, autor]);

  const exportar = async (r: StandaloneReport) => {
    setExportando(r.id);
    try {
      const blob = await generateIncidentPdf({
        casillas: [
          { etiqueta: 'NOMBRE', valor: r.author_name },
          { etiqueta: 'FECHA', valor: fechaImpresa(r.report_date) },
          { etiqueta: 'UBICACIÓN', valor: r.location ?? '' },
        ],
        descripcion: r.description,
        fecha: fechaImpresa(r.report_date),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivoInforme(r.report_date, r.location ?? '');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Error al generar el PDF', variant: 'destructive' });
    } finally {
      setExportando(null);
    }
  };

  const borrar = async (r: StandaloneReport) => {
    setBorrando(r.id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('standalone_reports').delete().eq('id', r.id);
      if (error) throw error;
      setInformes((prev) => prev.filter((x) => x.id !== r.id));
      setABorrar(null);
      toast({ title: 'Informe borrado' });
    } catch (e) {
      toast({
        title: 'No se pudo borrar',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setBorrando(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Informes de incidente ({informes.length})
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={cargar} disabled={cargando} title="Recargar">
            <RefreshCw className={cargando ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAbierto((v) => !v)}>
            {abierto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {abierto ? 'Ocultar' : 'Ver informes'}
          </Button>
        </div>
      </CardHeader>

      {abierto && (
      <CardContent className="space-y-3">
        {informes.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar por nombre, ubicación o texto…"
              className="h-9 sm:flex-1"
            />
            <Select value={autor} onValueChange={setAutor}>
              <SelectTrigger className="h-9 sm:w-64">
                <SelectValue placeholder="Todos los usuarios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los usuarios ({informes.length})</SelectItem>
                {autores.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.etiqueta} ({a.cuantos})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {cargando ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visibles.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {informes.length === 0 ? 'Todavía no hay informes.' : 'Ningún informe coincide con la búsqueda.'}
          </p>
        ) : (
          visibles.map((r) => {
            const esteAbierto = desplegado === r.id;
            return (
            <div key={r.id} className="min-w-0 space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <button
                type="button"
                className="flex w-full min-w-0 items-start gap-2 text-left"
                onClick={() => setDesplegado(esteAbierto ? null : r.id)}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
                    <span className="flex items-center gap-1.5">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      {r.author_name}
                    </span>
                    <span className="font-mono text-muted-foreground">{fechaImpresa(r.report_date)}</span>
                    {r.location && (
                      <span className="flex items-center gap-1 font-mono text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {r.location}
                      </span>
                    )}
                  </span>
                  {!esteAbierto && (
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                      {resumenInforme(r.description, 120)}
                    </span>
                  )}
                </span>
                {esteAbierto
                  ? <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  : <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
              </button>

              {esteAbierto && (
              <>
              {/* break-words: una referencia larga sin espacios estiraría la tarjeta. */}
              <p className="whitespace-pre-wrap break-words text-sm">{r.description}</p>

              <p className="text-xs text-muted-foreground">
                Escrito el {format(parseISO(r.created_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => exportar(r)}
                  disabled={exportando === r.id}
                >
                  {exportando === r.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <FileDown className="h-3.5 w-3.5" />}
                  PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto gap-1.5 text-xs text-destructive hover:text-destructive"
                  onClick={() => setABorrar(r)}
                  disabled={borrando === r.id}
                >
                  {borrando === r.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                  Borrar
                </Button>
              </div>
              </>
              )}
            </div>
            );
          })
        )}
      </CardContent>
      )}

      <AlertDialog open={!!aBorrar} onOpenChange={(v) => { if (!v && !borrando) setABorrar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este informe?</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {aBorrar && (
                <>
                  <span className="mb-2 block font-mono text-xs">
                    {aBorrar.author_name} · {fechaImpresa(aBorrar.report_date)}
                    {aBorrar.location ? ` · ${aBorrar.location}` : ''}
                  </span>
                  <span className="mb-2 block italic">«{resumenInforme(aBorrar.description, 120)}»</span>
                </>
              )}
              No se puede deshacer, y es el informe de otra persona: si lo necesitas sólo
              para dejar de verlo en la lista, no lo borres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!borrando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); if (aBorrar) void borrar(aBorrar); }}
              className="bg-destructive hover:bg-destructive/90"
              disabled={!!borrando}
            >
              {borrando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
