// Meteorología real del intervalo en que se trabajó una escala.
//
// Devuelve las observaciones (METAR) que cubren la ventana pedida y el TAF
// vigente. Vive en el servidor porque aviationweather.gov no permite que el
// navegador le pregunte directamente (CORS).
//
// Es un registro para poder explicar decisiones de seguridad semanas después
// —por qué no se pusieron los conos, por ejemplo—, así que se devuelve el
// METAR CRUDO: el texto oficial del aeropuerto, no una interpretación nuestra.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** La API da el histórico en horas hacia atrás desde ahora, no por fechas. */
const horasHaciaAtras = (desde: Date): number => {
  const h = Math.ceil((Date.now() - desde.getTime()) / 3_600_000) + 1;
  // Un mínimo de 2 para que entre siempre la observación previa al inicio, y
  // un tope de 36: más atrás la API deja de devolver y no tiene sentido pedirlo.
  return Math.min(Math.max(h, 2), 36);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { desde, estacion } = await req.json().catch(() => ({}));
    const inicio = desde ? new Date(desde) : null;
    if (!inicio || Number.isNaN(inicio.getTime())) {
      return json({ error: 'Falta "desde" o no es una fecha válida' }, 400);
    }
    const id = /^[A-Z]{4}$/.test(String(estacion ?? '').toUpperCase())
      ? String(estacion).toUpperCase()
      : 'LEMD';

    const horas = horasHaciaAtras(inicio);
    const cabeceras = { 'User-Agent': 'control-rampa/1.0' };

    const [obsRes, tafRes] = await Promise.all([
      fetch(`https://aviationweather.gov/api/data/metar?ids=${id}&format=json&hours=${horas}`, { headers: cabeceras }),
      fetch(`https://aviationweather.gov/api/data/taf?ids=${id}&format=json`, { headers: cabeceras }),
    ]);

    if (!obsRes.ok) return json({ error: `El servicio meteorológico respondió ${obsRes.status}` }, 502);

    const observaciones = await obsRes.json();
    // El TAF es un extra: si falla, se devuelve lo demás igual. Lo que vale
    // como prueba es el METAR, que es lo que pasó de verdad.
    let taf: string | null = null;
    try {
      const t = await tafRes.json();
      taf = (Array.isArray(t) ? t[0]?.rawTAF : null) ?? null;
    } catch { /* sin previsión */ }

    return json({ estacion: id, observaciones, taf });
  } catch (e) {
    console.error('meteo-escala:', e);
    return json({ error: e instanceof Error ? e.message : 'Error inesperado' }, 502);
  }
});
