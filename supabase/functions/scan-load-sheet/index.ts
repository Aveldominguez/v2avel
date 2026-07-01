import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { imageBase64, mimeType } = await req.json();

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

Return a JSON object with this exact structure:
{
  "flightNumber": "AC0824",
  "flightDate": "30JUN2026",
  "aircraftType": "A333",
  "positions": [
    {
      "section": "FWD",
      "position": "11P",
      "containerId": "PMC48758R7",
      "destination": "MAD",
      "contentCode": "E",
      "pieces": 2,
      "weightKg": 530,
      "percentage": 100,
      "notes": "PRI, PIL, COL, HAZ ULDEAST",
      "isDoorPosition": false
    }
  ]
}

Rules:
- section: "FWD" for forward hold, "AFT" for aft hold, "BLK" for bulk
- position: exactly as printed (11P, 12P, 21P, 32L, 32R, 44, 53, etc.)
- contentCode: B=Baggage, C=Cargo, E=Economy express, X=Empty, BF=Business First, Q=other
- isDoorPosition: true ONLY if the position has a black background with white "DOOR" text label next to it on the sheet
- If a cell shows "NIL" it means empty — skip it or include with containerId null
- Extract ALL rows visible, both L and R for each row number
- weightKg and pieces from the line like "1/1384kg 100%" → pieces=1, weightKg=1384, percentage=100
- notes: any additional text lines below the main container line
- Return ONLY valid JSON, no explanation.`;

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
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
              { type: "text", text: prompt },
            ],
          },
        ],
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
