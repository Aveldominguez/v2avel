// Flight lookup using Flightradar24 API
// Set via: supabase secrets set FR24_API_KEY=your_key
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  // FR24 returns { data: [...] } typically
  const arr = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
  if (!arr.length) return { found: false };
  const f = arr[0];

  const airline_iata = pick<string>(f, ['airline.iata', 'airline_iata', 'operating_as', 'painted_as']);
  const airline_name = pick<string>(f, ['airline.name', 'airline_name', 'operator']);
  const aircraft_model = pick<string>(f, ['aircraft.model', 'aircraft.type', 'type', 'aircraft_type', 'aircraft.code']);
  const aircraft_registration = pick<string>(f, ['aircraft.registration', 'registration', 'reg']);

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

async function fr24Fetch(endpoint: string, flightIata: string, apiKey: string): Promise<any | null> {
  const url = `${endpoint}?flight_iata=${encodeURIComponent(flightIata)}&limit=1`;
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept-Version': 'v1',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`FR24 ${endpoint} → ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`FR24 ${endpoint} fetch error:`, err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    // 1) Try live
    let raw = await fr24Fetch('https://fr24api.flightradar24.com/api/live/flight-positions/full', flight_iata, apiKey);
    let normalized = raw ? normalize(raw) : { found: false };

    // 2) Fallback to historic
    if (!normalized.found) {
      raw = await fr24Fetch('https://fr24api.flightradar24.com/api/historic/flight-events/full', flight_iata, apiKey);
      normalized = raw ? normalize(raw) : { found: false };
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
