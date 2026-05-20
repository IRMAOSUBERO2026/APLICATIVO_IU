import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wtrefsziscauokudnxgz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DLAlIkksoQ-2qO40Y0hfzA_0pazWsNk";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function inspectObraRDOs() {
  const obraId = "aee7a490-6fa1-4023-b9bc-4a4695a2950b";
  console.log(`Querying diarios_obra for obra_id = ${obraId}...`);
  
  const { data, error } = await supabase
    .from("diarios_obra")
    .select("id, data, responsavel, clima, observacoes, fotos, created_at, updated_at")
    .eq("obra_id", obraId)
    .order("updated_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("Error querying:", error);
    return;
  }

  console.log(`Found ${data.length} RDOs for this obra.`);
  data.forEach((r, idx) => {
    console.log(`\n--- RDO #${idx + 1} ---`);
    console.log(`ID: ${r.id}`);
    console.log(`Data: ${r.data}`);
    console.log(`Responsavel: ${r.responsavel}`);
    console.log(`Clima: ${r.clima}`);
    console.log(`Created: ${r.created_at} | Updated: ${r.updated_at}`);
    console.log(`Fotos column (length):`, r.fotos ? r.fotos.length : 0);
    if (r.fotos) {
      console.log(`Fotos:`, r.fotos.map(url => url ? url.slice(0, 120) : null));
    }
    console.log(`Observacoes preview (first 250 chars):`, r.observacoes ? r.observacoes.slice(0, 250) : "null");
    if (r.observacoes) {
      try {
        const parsed = JSON.parse(r.observacoes);
        console.log(`Parsed observacoes.fotos:`, parsed.fotos ? parsed.fotos.length : 0, "items");
        if (parsed.fotos && parsed.fotos.length > 0) {
          console.log(`Sample photo URL:`, parsed.fotos[0].url ? parsed.fotos[0].url.slice(0, 120) : parsed.fotos[0]);
        }
      } catch (e) {
        console.log("Observacoes is not JSON");
      }
    }
  });
}

inspectObraRDOs();
