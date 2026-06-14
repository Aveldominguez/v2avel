import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const url = 'https://aviationweather.gov/api/data/metar?ids=LEMD&format=json&taf=false'
    const res = await fetch(url, {
      headers: { 'User-Agent': 'v2avel-app/1.0' },
    })

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `NOAA HTTP ${res.status}` }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
