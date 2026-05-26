// This file was manually overridden to point to the OFFICIAL external Supabase
// project (wtrefsziscauokudnxgz). The schema there differs from the Lovable Cloud
// auto-generated types in ./types.ts, so we intentionally DO NOT pass <Database>
// to createClient — typing is loose here to avoid false TS errors against the
// stale Lovable Cloud schema. Runtime queries are validated against the real DB.
import { createClient } from '@supabase/supabase-js';

// USANDO SUPABASE EXTERNO wtrefsziscauokudnxgz (Aplicativo Bancodedados — OFICIAL)
const SUPABASE_URL = "https://wtrefsziscauokudnxgz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DLAlIkksoQ-2qO40Y0hfzA_0pazWsNk";

export const SUPABASE_URL_OFICIAL = SUPABASE_URL;
export const SUPABASE_ANON_OFICIAL = SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Verificação de runtime: garante que ninguém recriou o client apontando para
// o projeto errado (znfxvpggckayokiphglt) em caso de regeneração do Lovable Cloud.
if (typeof window !== "undefined") {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (envUrl && !envUrl.includes("wtrefsziscauokudnxgz")) {
    console.warn(
      "[supabase/client] AVISO: .env aponta para",
      envUrl,
      "— mas o app está fixado em",
      SUPABASE_URL,
      "(projeto oficial). Se a regeneração automática sobrescrever este arquivo, restaure-o."
    );
  }
}
