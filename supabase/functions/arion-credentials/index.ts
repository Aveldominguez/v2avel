// Manage ARION credentials per authenticated user.
// GET  → returns { has_login, arion_login, arion_station, arion_last_sync } (NEVER returns the password)
// POST → upserts { arion_login, arion_password, arion_station } for the caller
// Requires an approved (not blocked) user.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'unauthorized' }, 401);
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    // Approval gate
    const { data: profile } = await admin
      .from('profiles')
      .select('approved, blocked')
      .eq('user_id', userId)
      .maybeSingle();
    if (!profile || !profile.approved || profile.blocked) {
      return json({ error: 'forbidden' }, 403);
    }

    if (req.method === 'GET') {
      const { data, error } = await admin
        .from('arion_credentials')
        .select('arion_login, arion_station, arion_last_sync')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        console.error('read error', error);
        return json({ error: 'db_error' }, 500);
      }
      return json({
        has_login: !!data?.arion_login,
        arion_login: data?.arion_login ?? null,
        arion_station: data?.arion_station ?? 'MAD',
        arion_last_sync: data?.arion_last_sync ?? null,
      });
    }

    if (req.method === 'POST') {
      let body: any;
      try { body = await req.json(); } catch { return json({ error: 'invalid_body' }, 400); }
      const arion_login = typeof body?.arion_login === 'string' ? body.arion_login.trim() : '';
      const arion_password = typeof body?.arion_password === 'string' ? body.arion_password : '';
      const arion_station = typeof body?.arion_station === 'string' && body.arion_station.trim()
        ? body.arion_station.trim().toUpperCase().slice(0, 4)
        : 'MAD';

      if (!arion_login) return json({ error: 'missing_login' }, 400);

      // If no password supplied, preserve existing one
      const existing = !arion_password
        ? (await admin.from('arion_credentials').select('arion_password').eq('user_id', userId).maybeSingle()).data
        : null;
      const finalPassword = arion_password || existing?.arion_password || null;
      if (!finalPassword) return json({ error: 'missing_password' }, 400);

      const { error: upErr } = await admin
        .from('arion_credentials')
        .upsert({
          user_id: userId,
          arion_login,
          arion_password: finalPassword,
          arion_station,
        }, { onConflict: 'user_id' });
      if (upErr) {
        console.error('upsert error', upErr);
        return json({ error: 'db_error' }, 500);
      }
      return json({ ok: true });
    }

    return json({ error: 'method_not_allowed' }, 405);
  } catch (err) {
    console.error('arion-credentials error', err);
    return json({ error: 'internal_error' }, 500);
  }
});
