
CREATE TABLE public.pending_airlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cargo_departure text,
  cargo_arrival text,
  mail_departure text,
  mail_arrival text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_airlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view pending airlines" ON public.pending_airlines
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert pending airlines" ON public.pending_airlines
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update pending airlines" ON public.pending_airlines
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete pending airlines" ON public.pending_airlines
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.pending_airlines (name, cargo_departure, cargo_arrival, mail_departure, mail_arrival, notes) VALUES
  ('Aeeg', 'Alaire', 'Alaire', NULL, NULL, 'Pendiente de integrar'),
  ('BBT (TURCO)', 'IAS', 'IAS', NULL, NULL, 'Pendiente de integrar'),
  ('CMA', 'IAS', 'IAS', NULL, NULL, 'Pendiente de integrar'),
  ('GTI', 'WFS4 (Atados W3)', 'WFS2', NULL, NULL, 'Pendiente de integrar'),
  ('GTI FLORES', 'WFS4', 'WFS1', NULL, NULL, 'Pendiente de integrar');
