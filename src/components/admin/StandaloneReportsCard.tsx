import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, FileDown, Loader2, MapPin, RefreshCw, Trash2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateIncidentPdf } from '@/utils/generateIncidentPdf';
import { fechaImpresa, nombreArchivoInforme } from '@/components/StandaloneReportDialog';

export interface StandaloneReport {
  id: string;
  user_id: string;
  author_name: string;
  report_date: string;
  location: string | null;
  description: string;
  created_at: string;
}

/**
 * Los informes de incidente que no van ligados a una escala, todos juntos.
 *
 * Son los que se hacen desde la pantalla de inicio. El administrador los ve
 * completos porque un informe de incidente es justo lo que un responsable
 * tiene que poder leer, y puede reexportar el PDF tal cual lo entregó quien
 * lo escribió.
 */
export const StandaloneReportsCard: React.FC = () => {
  const [informes, setInformes] = useState<StandaloneReport[]>([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');

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

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return informes;
    return informes.filter((r) =>
      r.author_name.toLowerCase().includes(q) ||
      (r.location ?? '').toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q));
  }, [informes, filtro]);

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
    if (!confirm(`¿Borrar el informe de ${r.author_name} del ${fechaImpresa(r.report_date)}?`)) return;
    setBorrando(r.id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('standalone_reports').delete().eq('id', r.id);
      if (error) throw error;
      setInformes((prev) => prev.filter((x) => x.id !== r.id));
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
        <Button variant="ghost" size="icon" onClick={cargar} disabled={cargando} title="Recargar">
          <RefreshCw className={cargando ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {informes.length > 0 && (
          <Input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por nombre, ubicación o texto…"
            className="h-9"
          />
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
          visibles.map((r) => (
            <div key={r.id} className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
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
              </div>

              <p className="whitespace-pre-wrap text-sm">{r.description}</p>

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
                  onClick={() => borrar(r)}
                  disabled={borrando === r.id}
                >
                  {borrando === r.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                  Borrar
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
