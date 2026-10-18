/**
 * Cambio de correo de acceso, hecho por un administrador.
 *
 * No se usa el flujo normal de Supabase (`auth.updateUser({ email })`) porque
 * manda un enlace de confirmación al correo nuevo, y esta instalación no envía
 * correos: los usuarios se crean con `email_confirm: true` justo para no
 * depender de ello. Ese enlace no llegaría nunca y el cambio se quedaría a
 * medias sin que nadie se entere.
 *
 * Aquí se cambia al momento y se da por válido, y se actualiza también la
 * copia del correo en `profiles`, que es la que ve el panel.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Deliberadamente simple: lo que importa es que haya algo, una arroba y un
// dominio con punto. Validar correos con precisión es un pozo sin fondo.
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "No autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "No autorizado" }, 401);

    const callerId = claimsData.claims.sub;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return json({ error: "Solo administradores pueden cambiar correos" }, 403);
    }

    const { user_id, new_email } = await req.json();

    if (!user_id || typeof user_id !== "string" || !uuidRegex.test(user_id)) {
      return json({ error: "user_id inválido" }, 400);
    }

    const email = String(new_email ?? "").trim().toLowerCase();
    if (!emailRegex.test(email) || email.length > 160) {
      return json({ error: "El correo no tiene un formato válido" }, 400);
    }

    console.log(`Admin ${callerId} changing email for user ${user_id}`);

    const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {
      email,
      // Dado por válido en el acto: sin servidor de correo no hay confirmación
      // posible, y dejarlo sin confirmar cerraría el acceso al usuario.
      email_confirm: true,
    });

    if (updateError) {
      console.error("Error updating email:", updateError);
      const msg = /already|exists|registered/i.test(updateError.message ?? "")
        ? "Ese correo ya está en uso por otra cuenta"
        : (updateError.message || "Error al cambiar el correo");
      return json({ error: msg }, 400);
    }

    // La copia de `profiles` es la que se enseña en el panel y en los avisos:
    // si no se actualiza aquí, el panel seguiría mostrando el correo viejo.
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({ email, updated_at: new Date().toISOString() })
      .eq("user_id", user_id);

    if (profileError) {
      console.error("Email changed but profile copy failed:", profileError);
      return json({
        error: "El correo de acceso se cambió, pero no se pudo actualizar la ficha. Avisa al desarrollador.",
      }, 500);
    }

    console.log(`Email changed successfully for user ${user_id}`);
    return json({ success: true }, 200);
  } catch (err) {
    console.error("Unexpected error:", (err as Error).message);
    return json({ error: "Error interno del servidor" }, 500);
  }
});
