-- ============================================================
--  EJECUTAR EN EL SQL EDITOR DE SUPABASE  ·  PARTE 5
--  15/11/2026 · v2avel
--
--  Guarda lo que se añade a mano al BULK de Air Canada: un DAA de
--  una categoría, una silla de ruedas, una caja suelta. Cada línea
--  con su texto, su cantidad y su categoría.
--
--  Es una columna jsonb y no columnas fijas porque no se sabe qué
--  va a aparecer: hoy un DAA BY, mañana dos bicis.
-- ============================================================

ALTER TABLE public.ac_bulk_data
  ADD COLUMN IF NOT EXISTS extras jsonb NOT NULL DEFAULT '[]'::jsonb;
