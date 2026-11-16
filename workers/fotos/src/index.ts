/**
 * Pasarela de fotos: sirve el cubo v2avel-fotos de Cloudflare R2.
 *
 * El cubo es privado y lo seguirá siendo. Nada sale de aquí sin que antes se
 * compruebe la sesión del agente, porque en una hoja de carga hay nombres de
 * tripulación, matrículas y pesos. El equivalente exacto de las URL firmadas
 * de Supabase, que es lo que la app ya sabe pedir.
 *
 * Puertas:
 *   POST /firmar   la app, con su sesión, pide un enlace temporal
 *   GET  /f/<ruta> la imagen, con ese enlace firmado
 *   PUT  /f/<ruta> subir (paso 3)
 *   POST /borrar   borrar (paso 4)
 *   GET  /salud    comprobar que está viva
 */
import { firmar, verificar, puedeTocar, rutaSegura } from './firma';

export interface Env {
  FOTOS: R2Bucket;
  FIRMA_SECRETO: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ORIGENES: string;
}

const MAX_SEGUNDOS = 8 * 3600;   // un turno, igual que en Supabase
const MAX_SUBIDA = 25 * 1024 * 1024;

const cors = (req: Request, env: Env): Record<string, string> => {
  const origen = req.headers.get('origin') ?? '';
  const permitidos = (env.ORIGENES ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!permitidos.includes(origen)) return {};
  return {
    'access-control-allow-origin': origen,
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-allow-methods': 'GET,PUT,POST,OPTIONS',
    'vary': 'origin',
  };
};

const json = (datos: unknown, estado: number, cab: Record<string, string>) =>
  new Response(JSON.stringify(datos), {
    status: estado,
    headers: { 'content-type': 'application/json', ...cab },
  });

/** Quién llama. Se le pregunta a Supabase, que es quien manda sobre las sesiones. */
async function quienEs(req: Request, env: Env): Promise<{ uid: string; admin: boolean } | null> {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;

  const u = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: auth, apikey: env.SUPABASE_ANON_KEY },
  });
  if (!u.ok) return null;
  const usuario = await u.json<{ id?: string }>();
  if (!usuario?.id) return null;

  // Si esto falla, se da por NO administrador. Equivocarse hacia el lado que
  // deja ver de menos sólo rompe una foto; hacia el otro, las enseña todas.
  let admin = false;
  try {
    const r = await fetch(
      `${env.SUPABASE_URL}/rest/v1/user_roles?select=role&user_id=eq.${usuario.id}`,
      { headers: { authorization: auth, apikey: env.SUPABASE_ANON_KEY } },
    );
    if (r.ok) {
      const filas = await r.json<Array<{ role?: string }>>();
      admin = Array.isArray(filas) && filas.some((f) => f.role === 'admin');
    }
  } catch { /* no admin */ }

  return { uid: usuario.id, admin };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const cab = cors(req, env);

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cab });
    if (url.pathname === '/salud') return json({ ok: true }, 200, cab);

    // ---- Pedir un enlace para una foto -----------------------------------
    if (url.pathname === '/firmar' && req.method === 'POST') {
      const quien = await quienEs(req, env);
      if (!quien) return json({ error: 'sin sesión' }, 401, cab);

      const cuerpo = await req.json<{ ruta?: string; segundos?: number }>().catch(() => null);
      const ruta = cuerpo?.ruta ?? '';
      if (!rutaSegura(ruta)) return json({ error: 'ruta no válida' }, 400, cab);
      if (!puedeTocar(ruta, quien.uid, quien.admin)) return json({ error: 'no es tuya' }, 403, cab);

      const segundos = Math.min(Math.max(Number(cuerpo?.segundos) || MAX_SEGUNDOS, 60), MAX_SEGUNDOS);
      const exp = Math.floor(Date.now() / 1000) + segundos;
      const sig = await firmar(ruta, exp, env.FIRMA_SECRETO);
      const enlace = `${url.origin}/f/${ruta.split('/').map(encodeURIComponent).join('/')}?exp=${exp}&sig=${sig}`;
      return json({ url: enlace, exp }, 200, cab);
    }

    // ---- Servir la foto ---------------------------------------------------
    if (url.pathname.startsWith('/f/') && (req.method === 'GET' || req.method === 'HEAD')) {
      const ruta = decodeURIComponent(url.pathname.slice('/f/'.length));
      const exp = Number(url.searchParams.get('exp'));
      const sig = url.searchParams.get('sig') ?? '';
      if (!(await verificar(ruta, exp, sig, env.FIRMA_SECRETO))) {
        return new Response('enlace caducado o no válido', { status: 403, headers: cab });
      }
      const obj = await env.FOTOS.get(ruta);
      if (!obj) return new Response('no está', { status: 404, headers: cab });

      const cabeceras = new Headers(cab);
      obj.writeHttpMetadata(cabeceras);
      cabeceras.set('etag', obj.httpEtag);
      // Privada: la puede guardar el móvil del agente, nunca un intermediario.
      cabeceras.set('cache-control', 'private, max-age=604800');
      return new Response(req.method === 'HEAD' ? null : obj.body, { headers: cabeceras });
    }

    // ---- Subir (paso 3) ---------------------------------------------------
    if (url.pathname.startsWith('/f/') && req.method === 'PUT') {
      const quien = await quienEs(req, env);
      if (!quien) return json({ error: 'sin sesión' }, 401, cab);
      const ruta = decodeURIComponent(url.pathname.slice('/f/'.length));
      if (!puedeTocar(ruta, quien.uid, quien.admin)) return json({ error: 'no es tuya' }, 403, cab);

      const largo = Number(req.headers.get('content-length') ?? 0);
      if (largo > MAX_SUBIDA) return json({ error: 'demasiado grande' }, 413, cab);

      await env.FOTOS.put(ruta, req.body, {
        httpMetadata: { contentType: req.headers.get('content-type') ?? 'application/octet-stream' },
      });
      return json({ ok: true, ruta }, 200, cab);
    }

    // ---- Borrar (paso 4) --------------------------------------------------
    if (url.pathname === '/borrar' && req.method === 'POST') {
      const quien = await quienEs(req, env);
      if (!quien) return json({ error: 'sin sesión' }, 401, cab);
      const cuerpo = await req.json<{ ruta?: string }>().catch(() => null);
      const ruta = cuerpo?.ruta ?? '';
      if (!rutaSegura(ruta)) return json({ error: 'ruta no válida' }, 400, cab);
      if (!puedeTocar(ruta, quien.uid, quien.admin)) return json({ error: 'no es tuya' }, 403, cab);

      await env.FOTOS.delete(ruta);
      return json({ ok: true }, 200, cab);
    }

    return new Response('no existe', { status: 404, headers: cab });
  },
};
