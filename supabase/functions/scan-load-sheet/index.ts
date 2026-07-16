import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Solo usuarios autenticados y aprobados pueden usar el escáner
    // (la API de Anthropic tiene coste por llamada).
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: profile } = await admin
      .from("profiles")
      .select("approved, blocked")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!profile || !profile.approved || profile.blocked) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64, mimeType, expectedSection } = await req.json();

    if (!imageBase64 || !mimeType) {
      return new Response(
        JSON.stringify({ error: "imageBase64 and mimeType required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = `You are an expert aviation load sheet reader. Extract ALL cargo positions from this Air Canada load sheet image.

The sheet is for the ${expectedSection || 'unknown'} section of the aircraft.

Return a JSON object with this exact structure:
{
  "flightNumber": "AC0824",
  "flightDate": "30JUN2026",
  "aircraftType": "A333",
  "section": "FWD",
  "positions": [
    {
      "section": "FWD",
      "position": "11P",
      "containerId": "PMC48758R7",
      "weightKg": 530,
      "pieces": 2,
      "percentage": 100,
      "notes": "PRI, PIL, COL, HAZ ULDEAST — E",
      "isDoorPosition": false,
      "isNil": false
    }
  ]
}

Rules:
- section field at root level: "FWD" or "AFT" based on the header of the sheet
- Each position's section: "FWD" or "AFT" depending on which hold it belongs to
- position: exactly as printed (11P, 12P, 32L, 32R, 44, 53, etc.)
- isDoorPosition: true ONLY if the position has a black background with white "DOOR" text label on the sheet
- If a cell shows "NIL" — include it with containerId: null and isNil: true. Do NOT skip NIL positions.
- For non-NIL positions set isNil: false.
- Extract ALL rows, both L and R for each row number
- weightKg and pieces from lines like "1/1384kg 100%" → pieces=1, weightKg=1384, percentage=100
- notes: ALL text lines below the container ID line, including content codes (B, C, E, BF, etc.) — include them as part of the notes string (e.g. "C — PES SEAFOOD XYVR 034-3+")
- Do NOT include a separate contentCode field
- Return ONLY valid JSON, no explanation, no markdown.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${error}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: content }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
