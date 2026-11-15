-- ============================================================
--  EJECUTAR EN EL SQL EDITOR DE SUPABASE  ·  PARTE 6
--  15/11/2026 · v2avel
--
--  El BULK de Air Canada pasa a identificarse por la ESCALA.
--
--  Hasta ahora la clave era vuelo + fecha + tipo, y eso rompía de dos
--  maneras en una escala de SÓLO SALIDA, donde el número de llegada
--  está vacío:
--    · se guardaba con la clave en blanco y después no se encontraba
--      (la AC835 del 12/11 "perdió" 22 posiciones y el bulk entero,
--      que en realidad seguían guardadas);
--    · dos escalas de sólo salida el mismo día se pisaban entre ellas.
--
--  El id de la escala no está vacío nunca y no se repite.
--  Comprobado antes de entregarlo: no hay ninguna fila que choque.
-- ============================================================

-- 1. Fuera la clave vieja, que es la que impide dos escalas sin número.
DO $$
DECLARE n text;
BEGIN
  SELECT c.conname INTO n
    FROM pg_constraint c
   WHERE c.conrelid = 'public.ac_bulk_data'::regclass
     AND c.contype = 'u'
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname::text)
            FROM unnest(c.conkey) k JOIN pg_attribute a
              ON a.attrelid = c.conrelid AND a.attnum = k)
         = ARRAY['flight_date','flight_number','scan_type'];
  IF n IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.ac_bulk_data DROP CONSTRAINT %I', n);
    RAISE NOTICE 'Quitada la restricción %', n;
    RETURN;
  END IF;

  SELECT i.indexrelid::regclass::text INTO n
    FROM pg_index i
   WHERE i.indrelid = 'public.ac_bulk_data'::regclass
     AND i.indisunique
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname::text)
            FROM unnest(i.indkey) k JOIN pg_attribute a
              ON a.attrelid = i.indrelid AND a.attnum = k)
         = ARRAY['flight_date','flight_number','scan_type'];
  IF n IS NOT NULL THEN
    EXECUTE format('DROP INDEX %s', n);
    RAISE NOTICE 'Quitado el índice %', n;
  END IF;
END $$;

-- 2. La clave nueva. Sin WHERE: un índice parcial no vale como destino de
--    ON CONFLICT desde la app. No hace falta, porque en PostgreSQL dos nulos
--    no chocan entre sí y las filas antiguas sin escala conviven igual.
CREATE UNIQUE INDEX IF NOT EXISTS ac_bulk_data_escala_uniq
  ON public.ac_bulk_data (turnaround_id, scan_type);
