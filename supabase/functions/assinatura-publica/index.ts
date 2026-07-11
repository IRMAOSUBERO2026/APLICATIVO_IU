import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { action, token, cpf, dataUrl, motivo, userAgent } = await req.json();
    if (!token) return json({ error: "Token ausente." }, 400);

    const { data: assinatura } = await admin
      .from("assinaturas_digitais")
      .select("*")
      .eq("token_acesso", token)
      .maybeSingle();

    if (!assinatura) return json({ error: "not_found" }, 404);

    if (action === "get") {
      const [{ data: func }, { data: emp }] = await Promise.all([
        admin.from("funcionarios").select("nome, foto_url").eq("id", assinatura.funcionario_id).maybeSingle(),
        admin.from("empresas").select("razao_social, nome_fantasia, logo_url").eq("id", assinatura.empresa_id).maybeSingle(),
      ]);

      let state = "ok";
      if (new Date(assinatura.token_expiracao) < new Date()) {
        await admin.from("assinaturas_digitais").update({ status: "expirado" }).eq("id", assinatura.id);
        state = "expired";
      } else if (assinatura.status === "assinado" || assinatura.status === "recusado") {
        state = "already";
      } else if (assinatura.status === "pendente") {
        await admin.from("assinaturas_digitais")
          .update({ status: "visualizado", data_visualizacao: new Date().toISOString() })
          .eq("id", assinatura.id);
      }

      // Do not expose the raw token or CPF back to the browser
      const { token_acesso, ...safe } = assinatura as Record<string, unknown>;
      return json({ assinatura: safe, funcionario: func, empresa: emp, state });
    }

    if (action === "confirm-cpf") {
      const { data: func } = await admin
        .from("funcionarios").select("cpf").eq("id", assinatura.funcionario_id).maybeSingle();
      const stored = String(func?.cpf ?? "").replace(/\D/g, "");
      const input = String(cpf ?? "").replace(/\D/g, "");
      return json({ ok: input.length === 11 && input === stored });
    }

    if (action === "selfie") {
      if (typeof dataUrl !== "string" || !dataUrl.includes(",")) return json({ error: "Imagem inválida." }, 400);
      const [meta, b64] = dataUrl.split(",");
      const contentType = /data:(.*?);/.exec(meta)?.[1] || "image/jpeg";
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `assinaturas/${assinatura.id}/selfie_${Date.now()}.jpg`;
      const { error: upErr } = await admin.storage.from("documentos").upload(path, bytes, {
        contentType, upsert: true,
      });
      if (upErr) return json({ error: upErr.message }, 500);
      await admin.from("assinaturas_digitais")
        .update({ selfie_url: path, cpf_confirmado: true })
        .eq("id", assinatura.id);
      return json({ ok: true });
    }

    if (action === "sign") {
      await admin.from("assinaturas_digitais").update({
        status: "assinado",
        data_assinatura: new Date().toISOString(),
        ip_assinatura: req.headers.get("x-forwarded-for") || "browser",
        user_agent: String(userAgent ?? "").slice(0, 500),
      }).eq("id", assinatura.id);
      return json({ ok: true });
    }

    if (action === "refuse") {
      await admin.from("assinaturas_digitais").update({
        status: "recusado",
        motivo_recusa: String(motivo ?? "Recusado pelo funcionário").slice(0, 500),
        data_assinatura: new Date().toISOString(),
      }).eq("id", assinatura.id);
      return json({ ok: true });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (e) {
    return json({ error: (e as Error).message || "Erro inesperado." }, 500);
  }
});
