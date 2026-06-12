// Sync flights from ARION (Aviapartner) into public.scheduled_flights
// Credentials are received per-request and used only in memory — never stored.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ARION_BASE = 'https://api.aviapartner.aero/arion-services';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function todayDdMmYyyy(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function ddMmYyyyToIso(s: string): string {
  // "dd/MM/yyyy" → "yyyy-MM-dd"
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  return `${m[3]}-${m[2]}-${m[1]}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    // 1) Validate Supabase JWT and extract user_id
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'unauthorized' }, 401);
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'unauthorized' }, 401);
    const userId = userData.user.id;

    // 2) Parse body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'invalid_body' }, 400);
    }
    const arion_login = typeof body?.arion_login === 'string' ? body.arion_login.trim() : '';
    const arion_password = typeof body?.arion_password === 'string' ? body.arion_password : '';
    const station_code = typeof body?.station_code === 'string' && body.station_code.trim()
      ? body.station_code.trim().toUpperCase()
      : 'MAD';
    const flight_date_in = typeof body?.flight_date === 'string' && body.flight_date.trim()
      ? body.flight_date.trim()
      : todayDdMmYyyy();

    if (!arion_login || !arion_password) {
      return json({ error: 'missing_credentials' }, 400);
    }

    // 3) Login to ARION
    const loginRes = await fetch(`${ARION_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ login: arion_login, password: arion_password }),
    });

    if (!loginRes.ok) {
      const t = await loginRes.text().catch(() => '');
      console.error('ARION login failed', loginRes.status, t.slice(0, 200));
      return json({ error: 'arion_auth_failed' }, 401);
    }

    // 4) Extract JWT from Authorization header or body
    let arionJwt =
      loginRes.headers.get('Authorization') ||
      loginRes.headers.get('authorization') ||
      '';
    if (arionJwt.toLowerCase().startsWith('bearer ')) arionJwt = arionJwt.slice(7);

    if (!arionJwt) {
      try {
        const lj = await loginRes.clone().json();
        arionJwt = lj?.token || lj?.accessToken || lj?.access_token || '';
      } catch { /* ignore */ }
    }
    if (!arionJwt) {
      console.error('ARION login: no JWT in header or body');
      return json({ error: 'arion_auth_failed' }, 401);
    }

    // 5) Fetch flights
    const flightsRes = await fetch(`${ARION_BASE}/flights`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${arionJwt}`,
        'X-Station': station_code,
        'Accept': 'application/json',
      },
    });
    if (!flightsRes.ok) {
      const t = await flightsRes.text().catch(() => '');
      console.error('ARION flights failed', flightsRes.status, t.slice(0, 200));
      return json({ error: 'arion_flights_failed' }, 502);
    }
    const flightsJson = await flightsRes.json().catch(() => null);
    if (!flightsJson) return json({ error: 'arion_flights_failed' }, 502);

    const arrivals: any[] = Array.isArray(flightsJson?.arrivals) ? flightsJson.arrivals : [];
    const departures: any[] = Array.isArray(flightsJson?.departures) ? flightsJson.departures : [];
    const all = [...arrivals, ...departures];

    const isoDate = ddMmYyyyToIso(flight_date_in);
    const nowIso = new Date().toISOString();

    const rows = all
      .filter((f) => f && typeof f.fn === 'string' && f.fn.trim().length > 0)
      .map((f) => ({
        user_id: userId,
        flight_date: isoDate,
        flight_number: String(f.fn).trim(),
        airline_code: f.airline ?? null,
        registration: f.registrationNumber ?? null,
        aircraft_type: f.aircraftType ?? null,
        parking_code: f.parkingCode ?? null,
        source_station: f.sourceStation ?? null,
        edt: f.edt ?? null,
        adt: f.adt ?? null,
        sdt: f.sdt ?? null,
        movement_type: f.movementType ?? null,
        cancelled: Boolean(f.cancelled),
        flight_closed: Boolean(f.flightClosed),
        synced_at: nowIso,
      }));

    // 6) Upsert via service role (RLS-safe; user_id pinned to authenticated user)
    const admin = createClient(supabaseUrl, serviceKey);
    let synced = 0;
    if (rows.length > 0) {
      const { error: upErr, count } = await admin
        .from('scheduled_flights')
        .upsert(rows, { onConflict: 'user_id,flight_date,flight_number', count: 'exact' });
      if (upErr) {
        console.error('Upsert error', upErr);
        return json({ error: 'db_error', detail: upErr.message }, 500);
      }
      synced = count ?? rows.length;
    }

    // 7) Update profile last sync
    await admin
      .from('profiles')
      .update({ arion_last_sync: nowIso })
      .eq('user_id', userId);

    return json({ synced, date: isoDate });
  } catch (err) {
    console.error('sync-arion-flights error', err);
    return json({ error: 'internal_error' }, 500);
  }
});
