// Sync flights from ARION (Aviapartner) into public.scheduled_flights
//
// Two modes:
//   1. System / centralized sync (body.force === true OR no Authorization).
//      Uses ARION_SYSTEM_USER / ARION_SYSTEM_PASS secrets and writes rows
//      with user_id = NULL so every approved user can read them. Used by
//      the pg_cron job and the manual "Actualizar ARION" button.
//   2. Per-user sync (legacy). Uses the credentials stored in
//      public.arion_credentials for the calling user and writes rows
//      scoped to that user_id.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ARION_BASE = 'https://api.aviapartner.aero/arion-services';
const ARION_LOGIN_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/plain, */*',
  'Origin': 'https://arion.aviapartner.aero',
  'Referer': 'https://arion.aviapartner.aero/login',
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};
const ARION_API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/plain, */*',
  'Origin': 'https://arion.aviapartner.aero',
  'Referer': 'https://arion.aviapartner.aero/',
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

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

async function arionLogin(login: string, password: string): Promise<string | null> {
  const attempts = [
    { path: '/auth/login', body: { username: login, password } },
    { path: '/auth/login', body: { login, password } },
  ];

  let loginData: any = null;

  for (const attempt of attempts) {
    const url = `${ARION_BASE}${attempt.path}`;
    console.log('Attempting ARION login:', {
      url,
      bodyFields: Object.keys(attempt.body),
      headerFields: Object.keys(ARION_LOGIN_HEADERS),
      username: login,
      passwordLength: password?.length ?? 0,
    });

    const loginResp = await fetch(url, {
      method: 'POST',
      headers: ARION_LOGIN_HEADERS,
      body: JSON.stringify(attempt.body),
    });

    const loginText = await loginResp.text();
    console.log(`ARION login ${attempt.path} → ${loginResp.status}:`, loginText.substring(0, 300));

    if (!loginResp.ok) {
      console.error(`ARION login ${attempt.path} failed ${loginResp.status}:`, loginText.substring(0, 300));
      continue;
    }

    try {
      loginData = JSON.parse(loginText);
      break;
    } catch {
      console.error('ARION login response is not JSON:', loginText.substring(0, 100));
    }
  }

  if (!loginData) return null;

  const token = loginData?.token ?? loginData?.accessToken ?? loginData?.access_token ?? loginData?.jwt ?? null;
  console.log('ARION token fields available:', Object.keys(loginData ?? {}));

  if (!token) {
    console.error('ARION login OK but no token found. Fields:', Object.keys(loginData ?? {}).join(', '));
    return null;
  }
  return token;
}

serve(async (req) => {
  console.log('sync-arion-flights invoked', req.method);
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const admin = createClient(supabaseUrl, serviceKey);

      const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';

      let body: any = {};
      try { body = await req.json(); } catch { /* allow empty */ }

      // System sync: forced refresh (cron or "Actualizar ARION" button) or no auth header
      const isSystemSync = body?.force === true || !authHeader.startsWith('Bearer ');

      let userId: string | null = null;
      let arionLoginName: string | null = null;
      let arionPassword: string | null = null;
      let station_code = 'MAD';

      if (isSystemSync) {
        // Prefer credentials stored in DB (managed from admin panel). Fall back to env secrets.
        const { data: cfg, error: cfgErr } = await admin
          .from('arion_config')
          .select('username, password, station_code')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('arion_config read:', {
          hasData: !!cfg,
          cfgErr: cfgErr?.message ?? null,
          username: cfg?.username ?? 'MISSING',
          passwordLength: cfg?.password?.length ?? 0,
          station: cfg?.station_code ?? 'MISSING'
        });

        if (cfg?.username && cfg?.password) {
          arionLoginName = cfg.username;
          arionPassword = cfg.password;
        } else {
          arionLoginName = Deno.env.get('ARION_SYSTEM_USER') ?? null;
          arionPassword = Deno.env.get('ARION_SYSTEM_PASS') ?? null;
        }
        station_code = (cfg?.station_code || Deno.env.get('ARION_SYSTEM_STATION') || 'MAD').toUpperCase();
        if (!arionLoginName || !arionPassword) {
          return json({ error: 'missing_system_credentials' }, 500);
        }
      } else {

        // Per-user mode (legacy)
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: userData, error: userErr } = await userClient.auth.getUser();
        if (userErr || !userData?.user) return json({ error: 'unauthorized' }, 401);
        userId = userData.user.id;

        const { data: profile } = await admin
          .from('profiles')
          .select('approved, blocked')
          .eq('user_id', userId)
          .maybeSingle();
        if (!profile || !profile.approved || profile.blocked) {
          return json({ error: 'forbidden' }, 403);
        }

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
        arionLoginName = creds.arion_login;
        arionPassword = creds.arion_password;
        station_code = (creds.arion_station || 'MAD').toUpperCase();
      }

      const flight_date_in = typeof body?.flight_date === 'string' && body.flight_date.trim()
        ? body.flight_date.trim()
        : todayDdMmYyyy();

      // ---- Pre-flight validation: arion_config schema + station coherence ----
      const EXPECTED_CONFIG_FIELDS = ['username', 'password', 'station_code'] as const;
      const STATION_REGEX = /^[A-Z]{3}$/;
      const validation = {
        source: isSystemSync ? 'arion_config/env' : 'arion_credentials',
        username_present: Boolean(arionLoginName && arionLoginName.trim()),
        password_present: Boolean(arionPassword && arionPassword.trim()),
        username_length: arionLoginName?.trim().length ?? 0,
        password_length: arionPassword?.trim().length ?? 0,
        station_code,
        station_valid: STATION_REGEX.test(station_code),
        expected_config_fields: EXPECTED_CONFIG_FIELDS,
        login_headers: Object.keys(ARION_LOGIN_HEADERS),
        api_headers: Object.keys(ARION_API_HEADERS),
      };
      console.log('ARION pre-flight validation:', validation);

      if (isSystemSync) {
        // Re-read full row to verify schema matches what we expect
        const { data: cfgRow, error: cfgErr } = await admin
          .from('arion_config')
          .select('*')
          .limit(1)
          .maybeSingle();
        if (cfgErr) {
          console.error('arion_config read error', cfgErr);
          return json({ ok: false, error: 'arion_config_unreadable', detail: cfgErr.message });
        }
        const presentFields = cfgRow ? Object.keys(cfgRow) : [];
        const missing = EXPECTED_CONFIG_FIELDS.filter((f) => !presentFields.includes(f));
        if (missing.length > 0) {
          console.error('arion_config missing expected fields', { presentFields, missing });
          return json({
            ok: false,
            error: 'arion_config_schema_mismatch',
            missing,
            present: presentFields,
            message: `arion_config no contiene los campos esperados: ${missing.join(', ')}`,
          });
        }
        if (!cfgRow?.username || !cfgRow?.password) {
          console.warn('arion_config row empty, falling back to env secrets');
        }
      }

      if (!validation.username_present || !validation.password_present) {
        return json({
          ok: false,
          error: 'arion_credentials_empty',
          validation,
          message: 'Faltan usuario o contraseña ARION en la configuración.',
        });
      }

      if (!validation.station_valid) {
        return json({
          ok: false,
          error: 'arion_station_invalid',
          validation,
          message: `La estación configurada (${station_code}) no es válida. Debe ser un código IATA de 3 letras (ej: MAD, BCN).`,
        });
      }
      // ---- End pre-flight validation ----

      const arionJwt = await arionLogin(arionLoginName!.trim(), arionPassword!.trim());
      if (!arionJwt) {
        return json({
          ok: false,
          error: 'arion_auth_failed',
          validation,
          message: 'ARION rechazó las credenciales guardadas. Revisa usuario/contraseña en el panel de administración.',
        });
      }

      const authHeaders: Record<string, string> = {
        'Authorization': `Bearer ${arionJwt}`,
        ...ARION_API_HEADERS,
      };

      const flightsRes = await fetch(`${ARION_BASE}/flights`, { method: 'GET', headers: authHeaders });
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

      const snToFn = new Map<number, string>();
      for (const f of allFlights) {
        if (f?.sn && f?.fn) {
          snToFn.set(Number(f.sn), String(f.fn).trim());
        }
      }

      const rows = await Promise.all(uniqueFlights
        .filter((f) => f && typeof f.fn === 'string' && f.fn.trim().length > 0)
        .map(async (f) => {
          const isArrival = String(f.movementType ?? '').toUpperCase() === 'A';
          let ldm_raw: string | null = null;
          let airline_logo: string | null = null;
          let scheduled_arrival_time: string | null = null;
          let scheduled_departure_time: string | null = null;
          try {
            const detailResp = await fetch(`${ARION_BASE}/flights/${f.sn}`, { headers: authHeaders });
            if (detailResp.ok) {
              const detail = await detailResp.json();
              const side = isArrival ? detail?.arrival : detail?.departure;
              airline_logo = side?.airlineLogo ?? null;
              scheduled_arrival_time =
                detail?.arrival?.scheduledArrivalTime ??
                detail?.arrival?.sta ??
                detail?.arrival?.scheduledTime ??
                null;
              scheduled_departure_time =
                detail?.departure?.scheduledDepartureTime ??
                detail?.departure?.std ??
                detail?.departure?.scheduledTime ??
                null;

              // TEMP DEBUG — remove after confirming field names
              console.log('ARION flight fields:', JSON.stringify({
                sn: f.sn,
                movementType: f.movementType,
                allListFields: Object.keys(f),
                allDetailFields: f.movementType === 'A'
                  ? Object.keys(detail?.arrival ?? {})
                  : Object.keys(detail?.departure ?? {}),
                candidates: {
                  listLevel: {
                    sta: f.sta,
                    std: f.std,
                    scheduledTime: f.scheduledTime,
                    scheduledArrivalTime: f.scheduledArrivalTime,
                    scheduledDepartureTime: f.scheduledDepartureTime,
                  },
                  detailArrival: {
                    sta: detail?.arrival?.sta,
                    std: detail?.arrival?.std,
                    scheduledTime: detail?.arrival?.scheduledTime,
                    scheduledArrivalTime: detail?.arrival?.scheduledArrivalTime,
                  },
                  detailDeparture: {
                    sta: detail?.departure?.sta,
                    std: detail?.departure?.std,
                    scheduledTime: detail?.departure?.scheduledTime,
                    scheduledDepartureTime: detail?.departure?.scheduledDepartureTime,
                  }
                }
              }));

              if (isArrival) {

                const telexList = Array.isArray(side?.telexMessages) ? side.telexMessages : [];
                const ldmRef = telexList.find((t: any) => String(t?.type ?? '').toUpperCase() === 'LDM');
                if (ldmRef) {
                  const bodyResp = await fetch(`${ARION_BASE}/telex-messages/body`, {
                    method: 'POST',
                    headers: { ...authHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      messageNumber: ldmRef.messageNumber,
                      channel: ldmRef.channel,
                      type: ldmRef.type,
                      flightReference: ldmRef.flightReference,
                      date: ldmRef.date,
                      direction: ldmRef.direction,
                      time: ldmRef.time,
                    }),
                  });
                  if (bodyResp.ok) {
                    const j = await bodyResp.json().catch(() => null);
                    const lines: any[] = Array.isArray(j?.lines) ? j.lines : [];
                    if (lines.length > 0) {
                      ldm_raw = lines
                        .slice()
                        .sort((a: any, b: any) => (a.lineNumber ?? 0) - (b.lineNumber ?? 0))
                        .map((l: any) => l.data ?? '')
                        .join('\n');
                    }
                  }
                }
              }
            }
          } catch { /* ignore */ }
          return {
            user_id: userId, // null for system sync — visible to all approved users
            flight_date: isoDate,
            flight_number: String(f.fn).trim(),
            airline_code: f.airline ?? null,
            registration: f.registrationNumber || null,
            aircraft_type: f.aircraftType ?? null,
            parking_code: f.parkingCode ?? null,
            source_station: f.sourceStation ?? null,
            home_station: station_code,
            edt: f.edt ?? null,
            adt: f.adt ?? null,
            sdt: f.sdt ?? null,
            movement_type: f.movementType ?? null,
            cancelled: Boolean(f.cancelled),
            flight_closed: Boolean(f.flightClosed),
            departure_fn: f.cfn && snToFn.has(Number(f.cfn))
              ? snToFn.get(Number(f.cfn))!
              : null,
            connection_sdt: f.connectionSdt ?? null,
            ldm_raw,
            airline_logo,
            scheduled_arrival_time,
            scheduled_departure_time,
            synced_at: nowIso,
          };
        }));

      let synced = 0;
      if (rows.length > 0) {
        const onConflict = isSystemSync ? 'flight_date,flight_number' : 'user_id,flight_date,flight_number';
        const { error: upErr, count } = await admin
          .from('scheduled_flights')
          .upsert(rows, { onConflict, ignoreDuplicates: false, count: 'exact' });
        if (upErr) {
          console.error('Upsert error', upErr);
          return json({ error: 'db_error', detail: upErr.message }, 500);
        }
        synced = count ?? rows.length;
      }

      if (!isSystemSync && userId) {
        await admin
          .from('arion_credentials')
          .update({ arion_last_sync: nowIso })
          .eq('user_id', userId);
      }

      return json({ synced, date: isoDate, mode: isSystemSync ? 'system' : 'user' });
    } catch (err) {
      console.error('sync-arion-flights error', err);
      return json({ error: 'internal_error' }, 500);
    }
  } catch (err) {
    console.error('FATAL sync-arion-flights error:', String(err), err?.stack);
    return new Response(JSON.stringify({ error: 'fatal', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
