import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type" };
const EXT = "https://wtrefsziscauokudnxgz.supabase.co";
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const out: any = {};
  for (const name of ["DEST_SUPABASE_SERVICE_ROLE_KEY","SUPABASE_SERVICE_ROLE_KEY"]) {
    const key = Deno.env.get(name);
    if (!key) { out[name] = "missing"; continue; }
    try {
      const c = createClient(EXT, key);
      const { error } = await c.from("ponto_relatorio_importacoes").select("id").limit(1);
      out[name] = error ? `err:${error.message}` : "OK";
    } catch (e) { out[name] = `throw:${(e as Error).message}`; }
  }
  return new Response(JSON.stringify(out), { headers: { ...cors, "Content-Type": "application/json" } });
});
