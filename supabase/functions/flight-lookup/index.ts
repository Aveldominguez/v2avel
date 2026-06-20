// Flight lookup using Flightradar24 API
// Secret required: FR24_API_KEY
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NormalizedResult {
  found: boolean;
  airline_iata?: string | null;
  airline_name?: string | null;
  aircraft_model?: string | null;
  aircraft_registration?: string | null;
}

function pick<T = any>(obj: any, paths: string[]): T | null {
  for (const path of paths) {
    const parts = path.split('.');
    let cur: any = obj;
    let ok = true;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) {
        cur = cur[p];
      } else {
        ok = false;
        break;
      }
    }
    if (ok && cur !== null && cur !== undefined && cur !== '') return cur as T;
  }
  return null;
}

function normalize(raw: any): NormalizedResult {
  const arr = Array.isArray(raw?.data) ? raw.data
    : Array.isArray(raw) ? raw
    : Array.isArray(raw?.results) ? raw.results
    : [];
  if (!arr.length) return { found: false };
  const f = arr[0];

  const airline_iata = pick<string>(f, [
    'painted_as', 'operating_as',
    'airline.iata', 'airline_iata',
    'airline.icao', 'airline_icao',
  ]);
  const airline_name = pick<string>(f, [
    'airline.name', 'airline_name', 'operator', 'operator_name',
  ]);
  const aircraft_model = pick<string>(f, [
    'type', 'aircraft_type', 'aircraft.model',
    'aircraft.code', 'aircraft.type', 'model',
  ]);
  const aircraft_registration = pick<string>(f, [
    'reg', 'registration', 'aircraft.registration', 'aircraft_registration',
  ]);

  if (!airline_iata && !airline_name && !aircraft_model && !aircraft_registration) {
    return { found: false };
  }

  return {
    found: true,
    airline_iata: airline_iata || null,
    airline_name: airline_name || null,
    aircraft_model: aircraft_model || null,
    aircraft_registration: aircraft_registration || null,
  };
}

async function fr24Fetch(url: string, apiKey: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept-Version': 'v1',
        'Accept': 'application/json',
      },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`FR24 ${url} → ${res.status}: ${text.slice(0, 300)}`);
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      console.error(`FR24 ${url} → invalid JSON: ${text.slice(0, 200)}`);
      return null;
    }
  } catch (err) {
    console.error(`FR24 ${url} fetch error:`, err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { flight_iata } = await req.json();
    if (!flight_iata || typeof flight_iata !== 'string' || flight_iata.length < 3) {
      return new Response(JSON.stringify({ error: 'Invalid flight_iata' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('FR24_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'FR24_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const flightNum = flight_iata.toUpperCase().trim();
    const BASE = 'https://fr24api.flightradar24.com/api';

    // 1) LIVE positions — parameter is `flights`, not `flight_iata`
    let raw = await fr24Fetch(
      `${BASE}/live/flight-positions/full?flights=${encodeURIComponent(flightNum)}&limit=1`,
      apiKey,
    );
    let normalized = raw ? normalize(raw) : { found: false };

    // 2) Fallback: flight-summary (covers landed flights within a date range)
    if (!normalized.found) {
      const today = new Date();
      const from = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);
      const to = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);
      raw = await fr24Fetch(
        `${BASE}/flight-summary/light?flights=${encodeURIComponent(flightNum)}&flight_datetime_from=${from}T00:00:00&flight_datetime_to=${to}T23:59:59`,
        apiKey,
      );
      normalized = raw ? normalize(raw) : { found: false };
    }

    if (!normalized.found && raw) {
      console.log(`FR24 no match for ${flightNum}. Raw sample:`, JSON.stringify(raw).slice(0, 400));
    }

    return new Response(JSON.stringify(normalized), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Flight lookup error:', error);
    return new Response(JSON.stringify({ found: false, error: 'Internal server error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
