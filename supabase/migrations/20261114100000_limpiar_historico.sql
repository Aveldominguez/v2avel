-- Que el administrador pueda limpiar el histórico de datos recuperables.
--
-- Se acumula una copia por cada pérdida y otra por cada restauración, así que
-- con el uso diario la lista se hace larga y deja de poder gestionarse.
--
-- Sólo el administrador, y sólo BORRAR: nadie puede modificar una copia para
-- que diga otra cosa, porque entonces dejaría de ser una prueba de lo que
-- había. Y nadie puede insertarlas a mano: eso lo hacen sólo los disparadores.
DROP POLICY IF EXISTS "El admin limpia el historial" ON public.turnaround_history;
CREATE POLICY "El admin limpia el historial" ON public.turnaround_history
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
