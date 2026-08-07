import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';

/**
 * In-app notifications for issue reports:
 * - Users: toast ✅ when one of their reports has been resolved (once per report).
 * - Admins: toast once per session when there are pending reports.
 */
export function useIssueReportNotifications() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  // User side: resolved reports not yet acknowledged
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('issue_reports')
          .select('id, flight_number')
          .eq('user_id', user.id)
          .eq('status', 'resolved')
          .is('user_notified_at', null);
        if (!data || data.length === 0) return;
        for (const r of data) {
          toast({
            title: '✅ Reporte de fallo resuelto',
            description: r.flight_number
              ? `Tu reporte del vuelo ${r.flight_number} ha sido resuelto por el administrador.`
              : 'Tu reporte de fallo ha sido resuelto por el administrador.',
          });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('issue_reports')
          .update({ user_notified_at: new Date().toISOString() })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .in('id', data.map((r: any) => r.id));
      } catch { /* ignore */ }
    })();
  }, [user]);

  // Admin side: pending reports notice (once per session)
  useEffect(() => {
    if (!user || !isAdmin) return;
    const KEY = 'issue-reports-admin-notice';
    if (sessionStorage.getItem(KEY)) return;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count } = await (supabase as any)
          .from('issue_reports')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        if (count && count > 0) {
          sessionStorage.setItem(KEY, '1');
          toast({
            title: `🐞 ${count} reporte${count > 1 ? 's' : ''} de fallo pendiente${count > 1 ? 's' : ''}`,
            description: 'Revísalos en el panel de administración.',
          });
        }
      } catch { /* ignore */ }
    })();
  }, [user, isAdmin]);
}
