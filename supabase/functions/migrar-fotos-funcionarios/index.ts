// Migra fotos de funcionários armazenadas em base64 (coluna foto_url do banco
// oficial externo) para o Storage, substituindo o valor por uma URL assinada
// de longa duração. Isso remove megabytes de dados das consultas do RH.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const EXT_URL = "https://wtrefsziscauokudnxgz.supabase.co";
const EXT_KEY = "sb_publishable_DLAlIkksoQ-2qO40Y0hfzA_0pazWsNk";
const BUCKET = "fotos-funcionarios";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extFetch(path: string, init: RequestInit = {}) {
  return fetch(`${EXT_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: EXT_KEY,
      Authorization: `Bearer ${EXT_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; contentType: string; ext: string } | null {
  const m = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl.trim());
  if (!m) return null;
  const contentType = m[1] || "image/jpeg";
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  return { bytes, contentType, ext };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({}));
  const limit: number = Number(body.limit ?? 100);
  const idsParam: string[] | undefined = Array.isArray(body.ids) ? body.ids : undefined;

  let rows: { id: string }[];
  if (idsParam) {
    rows = idsParam.map((id) => ({ id }));
  } else {
    const listRes = await extFetch(`funcionarios?select=id&foto_url=not.is.null&limit=${limit}`);
    if (!listRes.ok) {
      return new Response(JSON.stringify({ error: await listRes.text() }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    rows = await listRes.json();
  }

  let migradas = 0, ignoradas = 0;
  const erros: { id: string; erro: string }[] = [];

  for (const { id } of rows) {
    try {
      const oneRes = await extFetch(`funcionarios?select=foto_url&id=eq.${id}`);
      if (!oneRes.ok) throw new Error(await oneRes.text());
      const [row] = await oneRes.json();
      const foto: string | null = row?.foto_url ?? null;
      if (!foto || !foto.startsWith("data:")) { ignoradas++; continue; }

      const decoded = decodeDataUrl(foto);
      if (!decoded) { ignoradas++; continue; }

      const path = `funcionarios/${id}.${decoded.ext}`;
      const up = await supabase.storage.from(BUCKET).upload(path, decoded.bytes, {
        contentType: decoded.contentType, upsert: true,
      });
      if (up.error) throw up.error;

      const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, TEN_YEARS);
      if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("sem URL assinada");

      const patch = await extFetch(`funcionarios?id=eq.${id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ foto_url: signed.data.signedUrl }),
      });
      if (!patch.ok) throw new Error(await patch.text());

      migradas++;
    } catch (e) {
      erros.push({ id, erro: e instanceof Error ? e.message : String(e) });
    }
  }

  return new Response(JSON.stringify({ total: rows.length, migradas, ignoradas, erros }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
