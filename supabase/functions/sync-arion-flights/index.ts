// Sync flights from ARION (Aviapartner) into public.scheduled_flights
// Credentials are stored server-side in public.arion_credentials and read
// only by this function via the service role. They never leave the backend.
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
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return new Date().toISOString().slice(0, 10);
  return `${m[3]}-${m[2]}-${m[1]}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

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

    // Enforce approval gate server-side
    const { data: profile } = await admin
      .from('profiles')
      .select('approved, blocked')
      .eq('user_id', userId)
      .maybeSingle();
    if (!profile || !profile.approved || profile.blocked) {
      return json({ error: 'forbidden' }, 403);
    }

    let body: any = {};
    try { body = await req.json(); } catch { /* allow empty */ }
    const flight_date_in = typeof body?.flight_date === 'string' && body.flight_date.trim()
      ? body.flight_date.trim()
      : todayDdMmYyyy();

    // Read credentials from server-only table
    const { data: creds, error: credsErr } = await admin
      .from('arion_credentials')
      .select('arion_login, arion_password, arion_station')
      .eq('user_id', userId)
      .maybeSingle();
    if (credsErr) {
      console.error('creds read error', credsErr);
      return json({ error: 'db_error' }, 500);
    }
    if (!creds?.arion_login || !creds?.arion_password) {
      return json({ error: 'missing_credentials' }, 400);
    }
    const station_code = (creds.arion_station || 'MAD').toUpperCase();

    // Login to ARION
    const loginRes = await fetch(`${ARION_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://arion.aviapartner.aero',
        'Referer': 'https://arion.aviapartner.aero/login',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
      body: JSON.stringify({ login: creds.arion_login, password: creds.arion_password }),
    });
    if (!loginRes.ok) {
      console.error('ARION login failed', loginRes.status);
      return json({ error: 'arion_auth_failed' }, 401);
    }
    let arionJwt =
      loginRes.headers.get('Authorization') ||
      loginRes.headers.get('authorization') || '';
    if (arionJwt.toLowerCase().startsWith('bearer ')) arionJwt = arionJwt.slice(7);
    if (!arionJwt) {
      try {
        const lj = await loginRes.clone().json();
        arionJwt = lj?.token || lj?.accessToken || lj?.access_token || '';
      } catch { /* ignore */ }
    }
    if (!arionJwt) return json({ error: 'arion_auth_failed' }, 401);

    const flightsRes = await fetch(`${ARION_BASE}/flights`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${arionJwt}`,
        'X-Station': station_code,
        'Accept': 'application/json',
        'Origin': 'https://arion.aviapartner.aero',
        'Referer': 'https://arion.aviapartner.aero/',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
    });
    if (!flightsRes.ok) {
      console.error('ARION flights failed', flightsRes.status);
      return json({ error: 'arion_flights_failed' }, 502);
    }
    const flightsJson = await flightsRes.json().catch(() => null);
    if (!flightsJson) return json({ error: 'arion_flights_failed' }, 502);

    const arrivals: any[] = Array.isArray(flightsJson?.arrivals) ? flightsJson.arrivals : [];
    const departures: any[] = Array.isArray(flightsJson?.departures) ? flightsJson.departures : [];
    const allFlights = [...arrivals, ...departures];

    // Deduplicar por flight_number — arrivals tienen prioridad sobre departures
    const seen = new Map<string, typeof allFlights[0]>();
    for (const flight of allFlights) {
      if (flight && typeof flight.fn === 'string' && !seen.has(flight.fn)) {
        seen.set(flight.fn, flight);
      }
    }
    const uniqueFlights = Array.from(seen.values());

    const isoDate = ddMmYyyyToIso(flight_date_in);
    const nowIso = new Date().toISOString();

    const rows = uniqueFlights
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
        departure_fn: typeof f.cfn === 'string' && f.cfn.trim() ? String(f.cfn).trim() : null,
        synced_at: nowIso,
      }));

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

    // ── Cross-link arrivals → departures by parking_code (same day) ──
    try {
      const { data: arrivalsDb } = await admin
        .from('scheduled_flights')
        .select('id, parking_code, flight_date, edt')
        .eq('movement_type', 'A')
        .eq('user_id', userId)
        .eq('flight_date', isoDate)
        .or('departure_fn.is.null,departure_fn.eq.');

      const { data: departuresDb } = await admin
        .from('scheduled_flights')
        .select('id, flight_number, parking_code, flight_date, sdt')
        .eq('movement_type', 'D')
        .eq('user_id', userId)
        .eq('flight_date', isoDate);

      const parseTime = (s: string | null): number | null => {
        if (!s) return null;
        const m = String(s).match(/(\d{2}):(\d{2})/);
        if (!m) return null;
        return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      };

      for (const arr of arrivalsDb ?? []) {
        if (!arr.parking_code) continue;
        const candidates = (departuresDb ?? []).filter(
          (d) => d.parking_code === arr.parking_code && d.flight_date === arr.flight_date
        );
        if (candidates.length === 0) continue;

        let best = candidates[0];
        if (candidates.length > 1) {
          const arrMin = parseTime(arr.edt);
          if (arrMin != null) {
            const future = candidates.filter((d) => {
              const dm = parseTime(d.sdt);
              return dm != null && dm >= arrMin;
            });
            if (future.length > 0) {
              best = future.reduce((a, b) =>
                (parseTime(a.sdt) ?? Infinity) < (parseTime(b.sdt) ?? Infinity) ? a : b
              );
            }
          }
        }

        await admin
          .from('scheduled_flights')
          .update({ departure_fn: best.flight_number })
          .eq('id', arr.id);
      }
    } catch (linkErr) {
      console.warn('cross-link arrivals→departures failed', linkErr);
    }

    await admin
      .from('arion_credentials')
      .update({ arion_last_sync: nowIso })
      .eq('user_id', userId);

    return json({ synced, date: isoDate });
  } catch (err) {
    console.error('sync-arion-flights error', err);
    return json({ error: 'internal_error' }, 500);
  }
});
