// Listado de personal de Aviapartner, leído de ARION.
//
// Devuelve sólo número de empleado, nombre y apellidos: es lo único que manda
// ARION por aquí. Ni DNI, ni correo, ni teléfono.
//
// Vive en el servidor porque hace falta la contraseña de ARION, que no puede
// bajar nunca al móvil. El cliente guarda la lista en el propio teléfono para
// poder buscar sin cobertura, que en rampa es la mitad del tiempo.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ARION_BASE = 'https://api.aviapartner.aero/arion-services';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const CABECERAS = {
  'Accept': 'application/json, text/plain, */*',
  'Origin': 'https://arion.aviapartner.aero',
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
    '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

async function entrarEnArion(login: string, password: string): Promise<string | null> {
  const res = await fetch(`${ARION_BASE}/auth/login`, {
    method: 'POST',
    headers: { ...CABECERAS, 'Content-Type': 'application/json', Referer: 'https://arion.aviapartner.aero/login' },
    // El campo se llama `login`, NO `username`: con `username` ARION responde
    // 401 aunque la contraseña sea correcta. Es el id del input de su propio
    // formulario. Se pierde mucho tiempo con esto si no se sabe.
    body: JSON.stringify({ login: login.trim(), password }),
  });
  if (res.status === 401) {
    if (res.headers.get('password-expired-token')) {
      throw new Error('La contraseña de ARION ha caducado; hay que cambiarla en ARION y actualizarla aquí.');
    }
    throw new Error('ARION rechaza el usuario o la contraseña.');
  }
  if (!res.ok) throw new Error(`ARION respondió ${res.status} al iniciar sesión.`);

  const d = await res.json();
  // Según la cuenta, el token llega con uno u otro nombre.
  return d?.token ?? d?.accessToken ?? d?.access_token ?? d?.jwt ?? d?.idToken ?? null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Sólo para usuarios con sesión: el listado es personal de la empresa.
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'no_autenticado' }, 401);
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return json({ error: 'no_autenticado' }, 401);

    const { data: cfg } = await admin
      .from('arion_config')
      .select('username, password, station_code')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cfg?.username || !cfg?.password) {
      return json({ error: 'missing_system_credentials' }, 500);
    }
    const estacion = (cfg.station_code || 'MAD').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(estacion)) {
      return json({ error: `Estación inválida: "${estacion}"` }, 500);
    }

    const token = await entrarEnArion(cfg.username, cfg.password);
    if (!token) return json({ error: 'ARION no devolvió ningún token.' }, 502);

    const res = await fetch(`${ARION_BASE}/employee-info`, {
      headers: {
        ...CABECERAS,
        Referer: 'https://arion.aviapartner.aero/',
        Authorization: `Bearer ${token}`,
        // Sin X-Station ARION NO da error: devuelve una lista VACÍA con un 200.
        'X-Station': estacion,
      },
    });
    if (!res.ok) return json({ error: `ARION respondió ${res.status} al pedir el personal.` }, 502);

    const datos = await res.json();
    if (!Array.isArray(datos) || datos.length === 0) {
      return json({ error: `ARION no devuelve personal para la estación ${estacion}.` }, 502);
    }

    const empleados = datos
      .filter((e: Record<string, unknown>) => e && e.employeeId != null)
      .map((e: Record<string, unknown>) => ({
        id: String(e.employeeId),
        nombre: String(e.firstName ?? '').trim(),
        apellidos: String(e.lastName ?? '').trim(),
      }));

    return json({ estacion, actualizado: new Date().toISOString(), empleados });
  } catch (e) {
    console.error('arion-employees:', e);
    return json({ error: e instanceof Error ? e.message : 'Error inesperado' }, 502);
  }
});
