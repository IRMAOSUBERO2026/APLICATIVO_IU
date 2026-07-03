import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type" };
const ref = (u?: string) => { try { return new URL(u || "").host.split(".")[0]; } catch { return null; } };
serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  return new Response(JSON.stringify({
    SUPABASE_URL: ref(Deno.env.get("SUPABASE_URL")),
    EXT_SUPABASE_URL: ref(Deno.env.get("EXT_SUPABASE_URL")),
    has_SERVICE: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    has_DEST_SERVICE: !!Deno.env.get("DEST_SUPABASE_SERVICE_ROLE_KEY"),
    has_EXT_ANON: !!Deno.env.get("EXT_SUPABASE_ANON_KEY"),
  }), { headers: { ...cors, "Content-Type": "application/json" } });
});
