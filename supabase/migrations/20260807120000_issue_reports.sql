-- Reportes de fallos de la app, ligados a la escala desde la que se reportan.
CREATE TABLE public.issue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  turnaround_id UUID,
  flight_number TEXT,
  airline TEXT,
  aircraft_model TEXT,
  flight_date DATE,
  departure_time TEXT,
  matricula TEXT,
  tango TEXT,
  is_remote BOOLEAN DEFAULT FALSE,
  remote_location TEXT,
  description TEXT NOT NULL,
  screenshot_urls TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  user_notified_at TIMESTAMPTZ
);

ALTER TABLE public.issue_reports ENABLE ROW LEVEL SECURITY;

-- Usuarios: crean y ven sus propios reportes
CREATE POLICY "Users can insert own issue reports"
ON public.issue_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own issue reports"
ON public.issue_reports FOR SELECT
USING (auth.uid() = user_id);

-- Usuarios: pueden marcar como notificado su propio reporte resuelto
CREATE POLICY "Users can ack own resolved reports"
ON public.issue_reports FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins: ven y gestionan todos los reportes
CREATE POLICY "Admins can view all issue reports"
ON public.issue_reports FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all issue reports"
ON public.issue_reports FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_issue_reports_status ON public.issue_reports (status, created_at DESC);
CREATE INDEX idx_issue_reports_user ON public.issue_reports (user_id, status);
