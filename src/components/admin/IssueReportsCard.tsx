import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Bug, CheckCircle2, Clock, ExternalLink, Image as ImageIcon, Loader2, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl } from '@/utils/storageUrl';
import { setImpersonatedUser } from '@/utils/adminImpersonation';
import { cn } from '@/lib/utils';

export interface IssueReport {
  id: string;
  user_id: string;
  user_email: string | null;
  turnaround_id: string | null;
  flight_number: string | null;
  airline: string | null;
  aircraft_model: string | null;
  flight_date: string | null;
  departure_time: string | null;
  matricula: string | null;
  tango: string | null;
  is_remote: boolean;
  remote_location: string | null;
  description: string;
  screenshot_urls: string[];
  status: 'pending' | 'resolved';
  created_at: string;
  resolved_at: string | null;
}

interface IssueReportsCardProps {
  adminUserId: string;
}

export const IssueReportsCard: React.FC<IssueReportsCardProps> = ({ adminUserId }) => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('issue_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setReports((data ?? []) as IssueReport[]);
    } catch (err) {
      console.error('Error fetching issue reports:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const visible = showResolved ? reports : reports.filter(r => r.status === 'pending');

  const handleResolve = async (report: IssueReport) => {
    setResolving(report.id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('issue_reports')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: adminUserId,
        })
        .eq('id', report.id);
      if (error) throw error;
      setReports(prev => prev.map(r => r.id === report.id
        ? { ...r, status: 'resolved' as const, resolved_at: new Date().toISOString() }
        : r));
      toast({ title: 'Reporte resuelto', description: 'El usuario verá el ✅ en su escala.' });
    } catch (err) {
      console.error('Error resolving report:', err);
      toast({ title: 'Error', description: 'No se pudo marcar como resuelto.', variant: 'destructive' });
    } finally {
      setResolving(null);
    }
  };

  const handleOpenTurnaround = (report: IssueReport) => {
    if (!report.turnaround_id) return;
    // Impersonate the reporting user so the escala opens with their data
    setImpersonatedUser({ userId: report.user_id, email: report.user_email ?? '' });
    navigate(`/turnaround/${report.turnaround_id}`);
  };

  const handleViewScreenshot = async (value: string) => {
    const url = await getSignedUrl(value);
    if (url) window.open(url, '_blank', 'noopener');
    else toast({ title: 'Error', description: 'No se pudo abrir la captura.', variant: 'destructive' });
  };

  return (
    <Card className="card-operational">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Bug className="h-5 w-5 text-warning" />
          Reportes de fallos
          {pendingCount > 0 && (
            <Badge variant="destructive" className="ml-1">{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResolved(v => !v)}
              className="text-xs"
            >
              {showResolved ? 'Solo pendientes' : 'Ver resueltos'}
            </Button>
            <Button variant="ghost" size="icon" onClick={fetchReports} className="h-8 w-8" aria-label="Recargar reportes">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && reports.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando reportes…
          </div>
        )}
        {!loading && visible.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {showResolved ? 'No hay reportes.' : 'No hay reportes pendientes. 🎉'}
          </p>
        )}
        {visible.map(report => (
          <div
            key={report.id}
            className={cn(
              'rounded-lg border p-3 space-y-2',
              report.status === 'pending' ? 'border-warning/50 bg-warning/5' : 'border-border bg-muted/30'
            )}
          >
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {report.status === 'resolved'
                  ? <CheckCircle2 className="h-4 w-4 text-success" />
                  : <Clock className="h-4 w-4 text-warning" />}
                <span className="font-mono">{report.flight_number || 'Sin vuelo'}</span>
                {report.airline && <span className="text-muted-foreground font-normal">· {report.airline}</span>}
              </div>
              <Badge variant={report.status === 'pending' ? 'secondary' : 'outline'} className="text-xs">
                {report.status === 'pending' ? 'Pendiente' : '✅ Resuelto'}
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground font-mono flex flex-wrap gap-x-3 gap-y-0.5">
              {report.aircraft_model && <span>{report.aircraft_model}</span>}
              {report.matricula && <span>{report.matricula}</span>}
              {report.flight_date && <span>{format(new Date(report.flight_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}</span>}
              {report.departure_time && <span>STD {report.departure_time}</span>}
              <span>{`Parking ${report.tango || report.remote_location || '—'}${report.is_remote ? ' · Remoto' : ''}`}</span>
            </div>

            <p className="text-xs text-muted-foreground">
              {report.user_email || report.user_id} · {format(new Date(report.created_at), 'dd/MM/yyyy HH:mm')}
            </p>

            <p className="text-sm whitespace-pre-wrap">{report.description}</p>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              {report.screenshot_urls.map((url, idx) => (
                <Button
                  key={url}
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewScreenshot(url)}
                  className="gap-1.5 text-xs"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Captura {idx + 1}
                </Button>
              ))}
              {report.turnaround_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenTurnaround(report)}
                  className="gap-1.5 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver escala
                </Button>
              )}
              {report.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => handleResolve(report)}
                  disabled={resolving === report.id}
                  className="gap-1.5 text-xs ml-auto"
                >
                  {resolving === report.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Marcar resuelto
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default IssueReportsCard;
