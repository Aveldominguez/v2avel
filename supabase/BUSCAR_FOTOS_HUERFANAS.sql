-- ============================================================================
-- Fotos que ya no usa nadie. SÓLO LEE: no borra nada.
-- ============================================================================
--
-- Una foto es huérfana cuando ninguna escala NI ninguna copia del histórico
-- la menciona: quedan de escalas borradas, de subidas repetidas y de fotos
-- que se quitaron de la escala sin quitarlas del servidor.
--
-- Lo importante es de dónde se sacan las referencias. Si sólo se miraran las
-- escalas, se borrarían fotos que SÍ hacen falta para restaurar una copia
-- del histórico, y el recuperador quedaría restaurando huecos. Por eso el
-- histórico cuenta igual que la escala viva.
--
-- Las rutas se guardan de dos maneras según la antigüedad: el formato nuevo
-- «cubo:ruta» y el viejo, que era la URL pública entera. Se contemplan las
-- dos; dar por buena sólo la nueva marcaría como huérfanas todas las fotos
-- antiguas, que son justo las que más pesan.
-- ============================================================================

WITH referencias AS (
  SELECT ref FROM (
    -- Escalas vivas
    SELECT jsonb_array_elements_text(t.times -> 'loadingSheetUrls') AS ref
      FROM public.turnarounds t WHERE jsonb_typeof(t.times -> 'loadingSheetUrls') = 'array'
    UNION ALL
    SELECT jsonb_array_elements_text(t.times -> 'fileUrls')
      FROM public.turnarounds t WHERE jsonb_typeof(t.times -> 'fileUrls') = 'array'
    UNION ALL
    SELECT jsonb_array_elements_text(t.times -> 'observationPhotos')
      FROM public.turnarounds t WHERE jsonb_typeof(t.times -> 'observationPhotos') = 'array'
    -- Copias del histórico: si una copia la menciona, la foto hace falta
    UNION ALL
    SELECT jsonb_array_elements_text(h.times -> 'loadingSheetUrls')
      FROM public.turnaround_history h WHERE jsonb_typeof(h.times -> 'loadingSheetUrls') = 'array'
    UNION ALL
    SELECT jsonb_array_elements_text(h.times -> 'fileUrls')
      FROM public.turnaround_history h WHERE jsonb_typeof(h.times -> 'fileUrls') = 'array'
    UNION ALL
    SELECT jsonb_array_elements_text(h.times -> 'observationPhotos')
      FROM public.turnaround_history h WHERE jsonb_typeof(h.times -> 'observationPhotos') = 'array'
    -- Capturas de los reportes de fallo
    UNION ALL
    SELECT jsonb_array_elements_text(to_jsonb(r.screenshot_urls))
      FROM public.issue_reports r WHERE r.screenshot_urls IS NOT NULL
  ) x
  WHERE ref IS NOT NULL AND ref <> ''
),
rutas_en_uso AS (
  SELECT DISTINCT
    CASE
      -- Formato viejo: URL pública entera, a veces con ?token=...
      WHEN ref LIKE 'http%'
        THEN split_part(regexp_replace(ref, '^.*/(turnaround-files|loading-sheets)/', ''), '?', 1)
      -- Formato nuevo: «cubo:ruta»
      WHEN position(':' IN ref) > 0
        THEN substr(ref, position(':' IN ref) + 1)
      ELSE ref
    END AS ruta
  FROM referencias
),
huerfanas AS (
  SELECT o.bucket_id, o.name, o.created_at,
         COALESCE((o.metadata ->> 'size')::bigint, 0) AS bytes
    FROM storage.objects o
   WHERE NOT EXISTS (SELECT 1 FROM rutas_en_uso u WHERE u.ruta = o.name)
)

-- 1) El resumen: cuántas sobran y cuánto se recuperaría.
SELECT bucket_id AS cubo,
       count(*) AS huerfanas,
       pg_size_pretty(sum(bytes)) AS se_recuperaria
  FROM huerfanas
 GROUP BY bucket_id
 ORDER BY sum(bytes) DESC;
