// FUNCIÓN TEMPORAL DE MIGRACIÓN — genera URLs firmadas de lectura para
// exportar los archivos de Storage al nuevo proyecto Supabase.
// Protegida por el secreto EXPORT_TOKEN (Lovable → Cloud → Secrets).
// Debe eliminarse una vez completada la migración.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
    }

    const expected = Deno.env.get("EXPORT_TOKEN");
    const got = req.headers.get("x-export-token");
    if (!expected || !got || got !== expected) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
    }

    const { bucket, paths } = await req.json();
    const validBuckets = new Set(["loading-sheets", "turnaround-files"]);
    if (!validBuckets.has(bucket) || !Array.isArray(paths) || paths.length === 0 || paths.length > 200) {
      return new Response(JSON.stringify({ error: "bad_request" }), { status: 400 });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await admin.storage.from(bucket).createSignedUrls(paths, 3600);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
