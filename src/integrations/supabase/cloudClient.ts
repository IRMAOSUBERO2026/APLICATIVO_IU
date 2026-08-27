import { createClient } from "@supabase/supabase-js";

const cloudUrl = import.meta.env.VITE_SUPABASE_URL;
const cloudPublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!cloudUrl || !cloudPublishableKey) {
  throw new Error("Configuração do backend de acessos indisponível.");
}

export const cloudClient = createClient(cloudUrl, cloudPublishableKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});