-- ============================================================================
-- Dónde se va el espacio. SÓLO LEE: no borra ni cambia nada.
-- Ejecutar en el editor SQL de Supabase, consulta por consulta.
-- ============================================================================

-- 1) Reparto por cubo: cuántos ficheros hay y cuánto ocupan.
SELECT bucket_id AS cubo,
       count(*) AS ficheros,
       pg_size_pretty(sum((metadata ->> 'size')::bigint)) AS ocupa,
       pg_size_pretty((avg((metadata ->> 'size')::bigint))::bigint) AS media_por_fichero
  FROM storage.objects
 GROUP BY bucket_id
 ORDER BY sum((metadata ->> 'size')::bigint) DESC;


-- 2) Reparto por mes: dice si el peso está en lo antiguo o en lo de ahora,
--    y a qué ritmo crece.
SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS mes,
       count(*) AS ficheros,
       pg_size_pretty(sum((metadata ->> 'size')::bigint)) AS ocupa
  FROM storage.objects
 GROUP BY 1
 ORDER BY 1;


-- 3) Los 20 ficheros más pesados: a veces unas pocas fotos sin comprimir
--    pesan más que cientos normales.
SELECT bucket_id AS cubo,
       name AS fichero,
       pg_size_pretty((metadata ->> 'size')::bigint) AS ocupa,
       created_at::date AS subido
  FROM storage.objects
 ORDER BY (metadata ->> 'size')::bigint DESC
 LIMIT 20;


-- 4) Cuánto pesan las fotos de más de 3 meses, que es lo primero que se
--    podría mover fuera sin estorbar el día a día.
SELECT count(*) AS ficheros,
       pg_size_pretty(sum((metadata ->> 'size')::bigint)) AS ocupa
  FROM storage.objects
 WHERE created_at < now() - interval '3 months';


-- 5) Tamaño de la base de datos por tabla, por descartar que el peso esté
--    ahí. Es una cuenta aparte de la de ficheros.
SELECT relname AS tabla,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS ocupa
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r'
 ORDER BY pg_total_relation_size(c.oid) DESC
 LIMIT 15;
