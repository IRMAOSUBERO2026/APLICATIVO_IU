// Normaliza URLs de Storage do Supabase para o host atual.
// Necessário porque dados foram migrados de um projeto antigo para outro,
// mas as URLs públicas armazenadas no banco ainda apontam para o host antigo.
const CURRENT_SUPABASE_HOST = "wtrefsziscauokudnxgz.supabase.co";

export function normalizeStorageUrl(url: string | null | undefined): string {
  if (!url) return "";
  return url.replace(
    /https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//,
    `https://${CURRENT_SUPABASE_HOST}/storage/v1/object/public/`
  );
}
